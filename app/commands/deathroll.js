const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { findHeroNames } = require('@root/app/utils/sheet.js');
const { removeCommas, separateCellLocation, checkCooldown } = require('@root/app/utils/general');
const { findCol, findCell, findCellByValue, updateSheetValue, findCellByIndex } = require('@root/app/utils/basics');

const ongoingDeathrolls = new Map(); // Store ongoing Deathroll challenges

exports.createDeathroll = async (interaction) => {
    try {
        await interaction.deferReply(); // Acknowledge the interaction

        let heroNames = await findHeroNames(interaction.user.id);
        if (heroNames.length === 0) {
            await interaction.editReply({ content: "You don't have Heroes!", ephemeral: true });
            return;
        }
        // Extract the target user from the command
        const targetUser = interaction.options.getUser('target');
        const price = interaction.options.getNumber('price');
        if (!targetUser) {
            return interaction.editReply('You need to specify a valid user to challenge.');
        }

        heroNames = await findHeroNames(targetUser.id);
        if (heroNames.length === 0) {
            await interaction.editReply({ content: "Target user don't have any Heroes!", ephemeral: true });
            return;
        }

        // Generate a unique ID for this Deathroll challenge
        const uniqueId = `${interaction.user.id}-${Date.now()}`;

        // Build the button for the target player to react
        const button = new ButtonBuilder()
            .setCustomId(`acceptDeathroll-${uniqueId}`) // Use unique ID for this challenge
            .setLabel('Accept ⚔️')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(button);

        // Send the initial message
        const initialMessage = await interaction.editReply({
            content: `${targetUser}, you have been challenged to a Deathroll! 💀 Click the button to accept.`,
            components: [row],
        });

        // Create a button collector with a 15-minute timeout
        const filter = (btnInteraction) => {
            return btnInteraction.customId === `acceptDeathroll-${uniqueId}` && btnInteraction.user.id === targetUser.id;
        };

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15 * 60 * 1000 });

        collector.on('collect', async (btnInteraction) => {
            try {
                // Defer the button interaction
                await btnInteraction.deferUpdate(); // Acknowledge the button click

                // Check if the Deathroll is already in progress for this target
                if (ongoingDeathrolls.has(targetUser.id)) {
                    return await btnInteraction.followUp({ content: `${targetUser} has already accepted another Deathroll!`, ephemeral: true });
                }

                // Mark this Deathroll as ongoing
                ongoingDeathrolls.set(targetUser.id, uniqueId);

                // Start the Deathroll game
                const resultEmbed = await startDeathrollGame(interaction, interaction.user, targetUser, price);

                // Replace the initial invitation message with the result embed
                await initialMessage.edit({ embeds: [resultEmbed], components: [], content: "Result : " }); // resultEmbed is now the embed object


                // Clean up ongoingDeathrolls for this target after the game ends
                ongoingDeathrolls.delete(targetUser.id);


            } catch (error) {
                console.log("Error in onClick on Deathroll: " + error);
            }
        });

        collector.on('end', async (collected) => {
            try {
                if (collected.size === 0) {
                    // If the target user doesn't click within 15 minutes
                    await initialMessage.edit({
                        content: `⏰ Time's up! ${targetUser} did not accept the challenge.`,
                        components: [],
                    });
                }
            } catch (error) {
                console.log("Error in end on Deathroll: " + error);
            }
        });
    } catch (error) {
        console.error('Error creating Deathroll:', error);
    }
};

async function startDeathrollGame(interaction, challenger, target, price) {
    try {
        const rolls = [];
        let winner = null;
        let loser = null;

        // Continue rolling until one player rolls a 1
        while (!winner) {
            const challengerRoll = Math.floor(Math.random() * 100) + 1;
            const targetRoll = Math.floor(Math.random() * 100) + 1;

            rolls.push({ challengerRoll, targetRoll });

            if (challengerRoll === 1) {
                winner = challenger;
                loser = target; // Set the loser
                break;
            } else if (targetRoll === 1) {
                winner = target;
                loser = challenger; // Set the loser
                break;
            }
        }
        // Uncomment these lines if you want to update the balances after determining the winner/loser
        await updateLoser(loser.id, price);
        await updateWinner(winner.id, price)

        // Prepare the string to display rolls in two columns
        const rollsColumn = rolls.map((roll) => {
            return `${roll.challengerRoll.toString().padEnd(5)} | ${roll.targetRoll.toString().padEnd(5)}`;
        }).join('\n'); // Join the rows for display

        // Prepare the embed message with all rolls in two columns
        const embed = new EmbedBuilder()
            .setTitle('Deathroll Results 🏆')
            .setColor(winner === challenger ? 0x00FF00 : 0xFF0000) // Use hexadecimal values for colors
            .setDescription(`**${challenger.username}**      |      **${target.username}**\n` +
                `\`\`\`\n` +
                `${rollsColumn}\n` +
                `\`\`\``)
            .setFooter({ text: `**Winner: ${winner.username} 🎉**`, iconURL: winner.displayAvatarURL() });

        // Return the embed directly
        return embed; // Change this line to return the embed directly
    } catch (error) {
        console.log("Error in Deathroll game: " + error);
    }
}



const updateLoser = async (userId, price) => {
    try {
        const heroNames = await findHeroNames(userId);

        const row = await findCell("Pending Balance", "Main Roster", heroNames);
        if (row == null) {
            console.log("You don't have Hero in Pending Balance!");
            return false;
        }
        const col = await findCol("Pending Balance", "Deducts", separateCellLocation(row.index).row);
        if (col == null) {
            console.log("Deducts column not Found!");
            return false;
        }
        let newDeductsValue = (!col.value ? parseInt(price) : parseInt(removeCommas(col.value)) + parseInt(price));
        await updateSheetValue("Pending Balance", col.index, newDeductsValue);

        const colNotes = await findCol("Pending Balance", "Notes", separateCellLocation(row.index).row);
        if (colNotes == null) {
            console.log("Notes column not Found!");
            return false;
        }
        let newNotesValue = colNotes.value + (colNotes.value.length !== 0 ? "\n" : "") + `Balance decrease: ${price} for DeathRoll`;
        await updateSheetValue("Pending Balance", colNotes.index, newNotesValue);
    } catch (error) {
        console.log("error in update loser data in deathRoll : " + error);
        return false;
    }
}

const updateWinner = async (userId, price) => {
    try {
        const heroNames = await findHeroNames(userId);
        const row = await findCell("Pending Balance", "Main Roster", heroNames);
        if (row == null) {
            console.log("You don't have Hero in Pending Balance !");
            return false;
        }

        // update Bonus 
        const col = await findCol("Pending Balance", "Bonus", separateCellLocation(row.index).row);
        if (col == null) {
            console.log("Bonus column not Found !");
            return false;
        }
        let newBonusValue = (!col.value ? parseInt(price) : parseInt(removeCommas(col.value)) + parseInt(price));
        await updateSheetValue("Pending Balance", col.index, newBonusValue);

        // update notes
        const colNotes = await findCol("Pending Balance", "Notes", separateCellLocation(row.index).row);
        if (colNotes == null) {
            console.log("Notes column not Found !");
            return false;
        }
        let newNotesValue = colNotes.value + (colNotes.value.length !== 0 ? "\n" : "") + `Balance increase: ${parseInt(price)} For DeathRoll`;
        await updateSheetValue("Pending Balance", colNotes.index, newNotesValue);
    } catch (error) {
        console.log("error in update winner data in deathRoll : " + error);
        return false;
    }
}