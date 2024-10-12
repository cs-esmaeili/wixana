const { findHeroNames } = require('@root/app/utils/sheet.js');
const { removeCommas, separateCellLocation, checkCooldown } = require('@root/app/utils/general');
const { findCol, findCell, findCellByValue, updateSheetValue, findCellByIndex } = require('@root/app/utils/basics');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { isAdmin, getSheetData } = require('../utils/sheet');

exports.createLottery = async (interaction) => {
    try {
        if (!interaction.guild) {
            await interaction.reply({ content: 'This command can only be used in a server, not in DMs.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: false });

        const senderDiscordID = interaction.user.id;
        if (!isAdmin(senderDiscordID)) {
            await interaction.editReply({ content: 'You are not Admin!', ephemeral: true });
            return;
        }

        const days = interaction.options.getInteger('days');
        const hours = interaction.options.getInteger('hours');
        const minutes = interaction.options.getInteger('minutes');
        const ticketPrice = interaction.options.getNumber('ticketprice');
        const description = interaction.options.getString('description');
        const allowNumberTickets = interaction.options.getInteger('allownumbertickets');

        const now = new Date();
        const endTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000 + minutes * 60 * 1000);

        if (endTime <= now) {
            await interaction.editReply({ content: 'The end time must be in the future.', ephemeral: true });
            return;
        }

        const readableEndTime = endTime.toLocaleString('en-GB', { timeZone: 'Asia/Tehran' });

        let lotteryStatus = 'open';
        let totalTicketsBought = 0;
        let totalPrizePool = 0;

        const participants = new Map(); // Store participants and ticket counts

        const embed = new EmbedBuilder()
            .setTitle(`🎉 **Lottery: ${description}**`)
            .setDescription(
                `🎟️ **Ticket Price:** ${ticketPrice}\n🕰️ **Ends at:** ${readableEndTime} (Tehran Time)\n🛒 **Max Tickets per User:** ${allowNumberTickets}\n\n🟢 **Status:** ${lotteryStatus}\n🎫 **Total Tickets Bought:** ${totalTicketsBought}`
            )
            .setColor(0x00FF00)
            .setTimestamp(endTime);

        const button = new ButtonBuilder()
            .setCustomId('lottery-entry')
            .setLabel('🎟️ Buy a Ticket')
            .setStyle(ButtonStyle.Primary);

        const actionRow = new ActionRowBuilder().addComponents(button);

        const message = await interaction.editReply({
            embeds: [embed],
            components: [actionRow],
            ephemeral: false,
        });
        await interaction.followUp({
            content: '@everyone 🎉 The lottery has started!',
            ephemeral: false,
        });

        const context = {
            participants,
            totalTicketsBought,
            totalPrizePool,
            ticketPrice,
            description,
            allowNumberTickets,
            readableEndTime,
            embed,
            message,
            lotteryStatus,
            endTime, // Added endTime to context
            cooldowns: {},
        };

        const collector = createCollector(message, context, interaction);

        // Refresh embed and collector every 14 minutes
        const refreshInterval = setInterval(async () => {
            if (context.lotteryStatus === 'closed') {
                clearInterval(refreshInterval);
                return;
            }

            // Refresh the embed
            const updatedEmbed = EmbedBuilder.from(context.embed)
                .setDescription(
                    `🎟️ **Ticket Price:** ${ticketPrice}\n🕰️ **Ends at:** ${readableEndTime} (Tehran Time)\n🛒 **Max Tickets per User:** ${allowNumberTickets}\n\n🟢 **Status:** ${context.lotteryStatus}\n🎫 **Total Tickets Bought:** ${context.totalTicketsBought}`
                );

            await message.edit({ embeds: [updatedEmbed], components: [actionRow] });

        }, 14 * 60 * 1000); // Refresh every 14 minutes (less than 15 minutes)

    } catch (error) {
        console.error('Error creating lottery:', error);
        await interaction.editReply({ content: 'An error occurred while creating the lottery. Please try again.', ephemeral: true });
    }
};

const createCollector = (message, context, interaction) => {
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: context.endTime - Date.now(), // Set the remaining time for the collector
    });

    collector.on('collect', (buttonInteraction) => onClick(buttonInteraction, context));
    collector.on('end', () => onEnd(interaction, context));

    return collector;
}


const onClick = async (buttonInteraction, context) => {
    try {
        await buttonInteraction.deferReply({ ephemeral: true });
        const { participants, totalTicketsBought, totalPrizePool, ticketPrice, allowNumberTickets, embed, message, readableEndTime } = context;
        const user = buttonInteraction.user;

        const check = await checkCooldown();
        if (check.block) {
            return buttonInteraction.editReply(`Please wait ${check.time} more seconds before using another command.`);
        }

        const heroNames = await findHeroNames(user.id);
        if (heroNames.length === 0) {
            await buttonInteraction.editReply({ content: "You don't have Heroes!", ephemeral: true });
            return;
        }

        const currentCount = participants.get(user.id) || 0;

        // Check if the user already bought the maximum allowed number of tickets
        if (currentCount >= allowNumberTickets) {
            await buttonInteraction.editReply({ content: 'You have reached the maximum number of tickets you can buy.' });
            return;
        }

        // Prevent spamming by adding a simple cooldown
        if (context.cooldowns && context.cooldowns[user.id]) {
            const remainingTime = context.cooldowns[user.id] - Date.now();
            if (remainingTime > 0) {
                await buttonInteraction.editReply({ content: `Please wait ${Math.ceil(remainingTime / 1000)} more seconds before buying another ticket.` });
                return;
            }
        }

        // Set cooldown (e.g., 3 seconds to prevent spamming)
        context.cooldowns = context.cooldowns || {};
        context.cooldowns[user.id] = Date.now() + 3000;

        // Update participants and ticket counts
        participants.set(user.id, currentCount + 1);
        context.totalTicketsBought++;
        context.totalPrizePool = context.totalTicketsBought * ticketPrice;

        const reward1st = context.totalPrizePool * 0.50;
        const reward2nd = context.totalPrizePool * 0.35;
        const reward3rd = context.totalPrizePool * 0.10;

        // Update deducts and notes in the sheet
        const row = await findCell("Pending Balance", "Main Roster", heroNames);
        if (row == null) {
            await buttonInteraction.editReply({ content: "You don't have Hero in Pending Balance!", ephemeral: true });
            return;
        }
        const col = await findCol("Pending Balance", "Deducts", separateCellLocation(row.index).row);
        if (col == null) {
            await buttonInteraction.editReply({ content: "Deducts column not Found!", ephemeral: true });
            return;
        }
        let newDeductsValue = (!col.value ? parseInt(ticketPrice) : parseInt(removeCommas(col.value)) + parseInt(ticketPrice));
        await updateSheetValue("Pending Balance", col.index, newDeductsValue);

        const colNotes = await findCol("Pending Balance", "Notes", separateCellLocation(row.index).row);
        if (colNotes == null) {
            await buttonInteraction.editReply({ content: "Notes column not Found!", ephemeral: true });
            return;
        }
        let newNotesValue = colNotes.value + (colNotes.value.length !== 0 ? "\n" : "") + `Balance decrease: ${ticketPrice} for Lottery`;
        await updateSheetValue("Pending Balance", colNotes.index, newNotesValue);

        // Update embed dynamically
        const updatedEmbed = EmbedBuilder.from(embed)
            .setDescription(
                `🎟️ **Ticket Price:** ${ticketPrice}\n🕰️ **Ends at:** ${readableEndTime} (Tehran Time)\n🛒 **Max Tickets per User:** ${allowNumberTickets}\n\n🟢 **Status:** ${context.lotteryStatus}\n🎫 **Total Tickets Bought:** ${context.totalTicketsBought}\n\n🏅 **1st Prize:** ${reward1st}\n🥈 **2nd Prize:** ${reward2nd}\n🥉 **3rd Prize:** ${reward3rd}`
            );

        await message.edit({ embeds: [updatedEmbed] });

        await buttonInteraction.editReply({ content: `🎟️ ${user.username}, you have successfully bought a ticket! You now have ${currentCount + 1} tickets.` });
    } catch (error) {
        console.error('Error during ticket purchase:', error);
        await buttonInteraction.editReply({ content: 'An error occurred during the ticket purchase. Please try again later.' });
    }
}


const onEnd = async (interaction, context) => {
    try {
        const { participants, totalPrizePool, ticketPrice, totalTicketsBought, lotteryStatus, embed, message, readableEndTime, allowNumberTickets } = context;
        context.lotteryStatus = 'closed';

        if (participants.size === 0) {
            await interaction.followUp('No one entered the lottery.');
            return;
        }

        const winners = [...participants.keys()].sort(() => Math.random() - 0.5).slice(0, 3);
        const winnerTags = await Promise.all(winners.map(id => interaction.guild.members.fetch(id)));

        const remainingPrizePool = totalPrizePool * 0.95;
        const fee = totalPrizePool * 0.05;

        let reward1st = remainingPrizePool * 0.50;
        let reward2nd = remainingPrizePool * 0.35;
        let reward3rd = remainingPrizePool * 0.10;

        if (winners.length < 3) {
            if (winners.length === 2) {
                reward1st += reward3rd;
                reward3rd = 0;
            } else if (winners.length === 1) {
                reward1st += reward2nd + reward3rd;
                reward2nd = reward3rd = 0;
            }
        }

        const rewardDistribution = [
            { winner: winners[0], reward: reward1st },
            { winner: winners[1], reward: reward2nd },
            { winner: winners[2], reward: reward3rd },
        ].filter(entry => entry.winner);

        const channel = interaction.channel || message.channel;

        // Notify everyone and tag the winners
        const endNotification = `🏆 @everyone The lottery has ended!\n\n🎉 **Winners:**\n🏅 1st Place: ${winnerTags[0]?.toString() || 'N/A'}\n🥈 2nd Place: ${winnerTags[1]?.toString() || 'N/A'}\n🥉 3rd Place: ${winnerTags[2]?.toString() || 'N/A'}\n **Thank you for participating in the lottery, the next lotteries will be posted on this channel soon**`;
        await channel.send(endNotification);

        const finalEmbed = EmbedBuilder.from(embed)
            .setDescription(
                `🎟️ **Ticket Price:** ${ticketPrice}\n🕰️ **Ended at:** ${readableEndTime} (Tehran Time)\n🛒 **Max Tickets per User:** ${allowNumberTickets}\n\n🔴 **Status:** Closed\n🎫 **Total Tickets Bought:** ${totalTicketsBought}\n\n🏅 **1st Prize:** ${reward1st}\n🥈 **2nd Prize:** ${reward2nd}\n🥉 **3rd Prize:** ${reward3rd}`
            );

        await message.edit({ embeds: [finalEmbed], components: [] }); // Disable the button

        const cellLottary = await findCellByValue("Pending Balance", "Lottary"); // I90
        if (!cellLottary) {
            console.log("Lottary cell not found !");
            return;
        }
        const sheetFee = await findCellByIndex("Pending Balance", separateCellLocation(cellLottary.index).col + (separateCellLocation(cellLottary.index).row + 1));
        if (!sheetFee) {
            console.log("sheetFee cell not found !");
            return;
        }
        let newValue = (!sheetFee.value ? parseInt(fee) : parseInt(removeCommas(sheetFee.value)) + parseInt(fee));
        await updateSheetValue("Pending Balance", sheetFee.index, newValue);

        rewardDistribution.forEach(async ({ winner, reward }) => {
            const heroNames = await findHeroNames(winner);
            if (heroNames.length === 0) {
                console.log(winner);
                console.log("winner Hero List is empty !");
                return;
            }
            const row = await findCell("Pending Balance", "Main Roster", heroNames);
            if (row == null) {
                console.log("You don't have Hero in Pending Balance !");
                return;
            }

            // update Bonus 
            const col = await findCol("Pending Balance", "Bonus", separateCellLocation(row.index).row);
            if (col == null) {
                console.log("Bonus column not Found !");
                return;
            }
            let newBonusValue = (!col.value ? parseInt(reward) : parseInt(removeCommas(col.value)) + parseInt(reward));
            await updateSheetValue("Pending Balance", col.index, newBonusValue);

            // update notes
            const colNotes = await findCol("Pending Balance", "Notes", separateCellLocation(row.index).row);
            if (colNotes == null) {
                console.log("Notes column not Found !");
                return;
            }
            let newNotesValue = colNotes.value + (colNotes.value.length !== 0 ? "\n" : "") + `Balance increase: ${parseInt(reward)} Win in Lottery`;
            await updateSheetValue("Pending Balance", colNotes.index, newNotesValue);
        });
    } catch (error) {
        console.error('Error ending lottery:', error);
    }
};
