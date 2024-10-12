const {
    findHeroNames,
    calculateActiveBlance,
    calculatePendingBlance,
    calculateLastMailedBalance,
    factor,
    createTextFile,
    calculatePaymentCharacter,
    getSheetData,
    appendToSheet,
    clearSheetCell
} = require('@root/app/utils/sheet.js');
const { updateSheetValue } = require('@root/app/utils/basics.js');
const { addCommas, checkCooldown } = require('@root/app/utils/general');
const { EmbedBuilder} = require('discord.js');
const { createLottery } = require("@root/app/commands/Lottery.js");
const { createGiveaway } = require("@root/app/commands/giveway.js");
const { roll } = require("@root/app/commands/roll.js");
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { isAdmin } = require('../utils/sheet');



exports.botInitListeners = async () => {
    global.client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand()) return;


        const check = await checkCooldown();
        if (check.block) {
            return interaction.reply(`Please wait ${check.time} more seconds before using another command.`);
        }

        try {
            const { commandName } = interaction;

            // Command handling logic
            if (commandName === 'addadmin') {
                await addAdmin(interaction);
            } else if (commandName === 'mycharacters') {
                await mycharacters(interaction);
            } else if (commandName === 'balance') {
                await balance(interaction);
            } else if (commandName === 'attendance') {
                await textFile(interaction);
            } else if (commandName === 'removeadmin') {
                await removeAdmin(interaction);
            } else if (commandName === 'addbalance') {
                await addBalance(interaction);
            } else if (commandName === 'transferbalance') {
                await transferBalance(interaction);
            } else if (commandName === 'creategiveaway') {
                await createGiveaway(interaction);
            } else if (commandName === 'createlottery') {
                await createLottery(interaction);
            } else if (commandName === 'roll') {
                await roll(interaction);
            }


        } catch (error) {
            console.error(error);
            interaction.reply('There was an error executing this command!');
        }
    });
};


const transferBalance = async (interaction) => {
    // Acknowledge the interaction to prevent timeout
    await interaction.deferReply({ ephemeral: false });

    const senderDiscordID = interaction.user.id;
    if (!isAdmin(senderDiscordID)) {
        await interaction.editReply({ content: 'You are not Admin !', ephemeral: true });
        return;
    }

    try {
        const fromDiscordID = interaction.options.getString('from'); // Get the source Discord ID from options
        const toDiscordID = interaction.options.getString('to'); // Get the target Discord ID from options
        const transferValue = interaction.options.getNumber('value'); // Get the transfer value from options
        console.log(`Transfer from ${fromDiscordID} to ${toDiscordID} with value: ${transferValue}`);

        // Fetch hero names for the 'from' and 'to' Discord IDs
        const fromHeroNames = await findHeroNames(fromDiscordID);
        const toHeroNames = await findHeroNames(toDiscordID);

        if (fromHeroNames.length === 0 || toHeroNames.length === 0) {
            await interaction.editReply('One or both Discord IDs have no associated hero names.');
            return;
        }

        const sheetName = 'Pending Balance'; // Your sheet name
        const sheetData = await getSheetData(sheetName); // Fetch the sheet data

        // Get the headers (first row)
        const headers = sheetData[1]; // Changed to 0 to get the actual headers

        // Find index of relevant columns
        const mainRosterIndex = headers.indexOf('Main Roster');
        const bonusIndex = headers.indexOf('Bonus');
        const deductsIndex = headers.indexOf('Deducts');
        const notesIndex = headers.indexOf('Notes');

        // Check if the columns exist
        if (mainRosterIndex === -1 || bonusIndex === -1 || deductsIndex === -1 || notesIndex === -1) {
            await interaction.editReply('One or more required columns not found.');
            return;
        }

        // Iterate over 'from' hero names to deduct balance
        for (const fromHeroName of fromHeroNames) {
            const fromRowIndex = sheetData.findIndex(row =>
                row[mainRosterIndex]?.toString().trim().toLowerCase() === fromHeroName.trim().toLowerCase()
            );

            if (fromRowIndex !== -1) {
                // Get current Bonus and Deducts values for 'from' hero
                const currentBonusFrom = sheetData[fromRowIndex][bonusIndex] || '0';
                const currentDeductsFrom = sheetData[fromRowIndex][deductsIndex] || '0';

                // Sanitize values to remove commas and non-numeric characters
                const sanitizedBonusFrom = currentBonusFrom.toString().replace(/,/g, '').replace(/[^0-9.-]+/g, '');
                const sanitizedDeductsFrom = currentDeductsFrom.toString().replace(/,/g, '').replace(/[^0-9.-]+/g, '');

                // Update values
                const updatedBonusFrom = Number(sanitizedBonusFrom) - Number(transferValue); // Deduct value
                const updatedDeductsFrom = Number(sanitizedDeductsFrom) + Number(transferValue); // Add to Deducts
                sheetData[fromRowIndex][bonusIndex] = updatedBonusFrom;
                sheetData[fromRowIndex][deductsIndex] = updatedDeductsFrom;

                // Prepare notes
                const currentNotesFrom = sheetData[fromRowIndex][notesIndex] || '';
                const notesFrom = `Balance transfer from: ${fromHeroName} to ${toHeroNames[0]} value : ${transferValue}`; // Assuming transfer to the first hero name found

                // Update notes conditionally
                const updatedNotesFrom = currentNotesFrom ? `${currentNotesFrom}\n${notesFrom}` : notesFrom;
                sheetData[fromRowIndex][notesIndex] = updatedNotesFrom;

                // Update the 'from' hero in the sheet
                await updateSheetValue(sheetName, `${String.fromCharCode(65 + bonusIndex)}${fromRowIndex + 1}`, updatedBonusFrom);
                await updateSheetValue(sheetName, `${String.fromCharCode(65 + deductsIndex)}${fromRowIndex + 1}`, updatedDeductsFrom);
                await updateSheetValue(sheetName, `${String.fromCharCode(65 + notesIndex)}${fromRowIndex + 1}`, updatedNotesFrom);
            }
        }

        // Iterate over 'to' hero names to add balance
        for (const toHeroName of toHeroNames) {
            const toRowIndex = sheetData.findIndex(row =>
                row[mainRosterIndex]?.toString().trim().toLowerCase() === toHeroName.trim().toLowerCase()
            );

            if (toRowIndex !== -1) {
                // Get current Bonus and Deducts values for 'to' hero
                const currentBonusTo = sheetData[toRowIndex][bonusIndex] || '0';

                // Sanitize values to remove commas and non-numeric characters
                const sanitizedBonusTo = currentBonusTo.toString().replace(/,/g, '').replace(/[^0-9.-]+/g, '');

                // Update values
                const updatedBonusTo = Number(sanitizedBonusTo) + Number(transferValue); // Add value

                // Update the 'to' hero in the sheet
                sheetData[toRowIndex][bonusIndex] = updatedBonusTo;

                await updateSheetValue(sheetName, `${String.fromCharCode(65 + bonusIndex)}${toRowIndex + 1}`, updatedBonusTo);

                // Prepare notes for 'to' hero
                const currentNotesTo = sheetData[toRowIndex][notesIndex] || '';
                const notesTo = `Balance transfer to ${toHeroName} from: ${fromHeroNames[0]} value : ${transferValue}`;

                // Update notes conditionally
                const updatedNotesTo = currentNotesTo ? `${currentNotesTo}\n${notesTo}` : notesTo;
                sheetData[toRowIndex][notesIndex] = updatedNotesTo;

                // Update notes in the sheet for the 'to' hero
                await updateSheetValue(sheetName, `${String.fromCharCode(65 + notesIndex)}${toRowIndex + 1}`, updatedNotesTo);
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Wixana Guild')
            .setDescription(`Blance Successfully transferred`)
            .setThumbnail(global.client.user.displayAvatarURL())
            .addFields(
                { name: 'From : ', value: (fromDiscordID + ""), inline: false },
                { name: 'To : ', value: (toDiscordID + ""), inline: false },
                { name: 'Value : ', value: (transferValue + ""), inline: false },
            );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error(`Error in transferBalance: ${error}`);
        await interaction.editReply('Failed to process the transferBalance command.');
    }
};


const addBalance = async (interaction) => {
    // Acknowledge the interaction to prevent timeout
    await interaction.deferReply({ ephemeral: false });
    const senderDiscordID = interaction.user.id;
    if (!isAdmin(senderDiscordID)) {
        await interaction.editReply({ content: 'You are not Admin !', ephemeral: true });
        return;
    }
    try {
        const discordID = interaction.options.getString('discordid'); // Get target Discord ID from slash command
        const newValue = interaction.options.getNumber('value'); // Get the new value from options

        // Fetch hero names from the Main Roster column of the Pending Balance sheet
        const heroNames = await findHeroNames(discordID);

        if (heroNames.length === 0) {
            await interaction.editReply('No hero names found for your Discord ID.');
            return;
        }

        const sheetName = 'Pending Balance'; // Your sheet name
        const sheetData = await getSheetData(sheetName); // Fetch the sheet data

        // Get the headers (first row)
        const headers = sheetData[1]; // Changed to 0 to get the actual headers

        // Find index of "Main Roster" column and "Bonus" column
        const mainRosterIndex = headers.indexOf('Main Roster');
        const bonusIndex = headers.indexOf('Bonus');
        const notesIndex = headers.indexOf('Notes');

        // Check if the columns exist
        if (mainRosterIndex === -1 || bonusIndex === -1 || notesIndex === -1) {
            await interaction.editReply('One or more required columns not found.');
            return;
        }


        // Iterate over hero names and update corresponding rows
        for (const heroName of heroNames) {
            // Log hero name for debugging

            // Normalize the hero name and row data by trimming and converting to lowercase
            const rowIndex = sheetData.findIndex(row =>
                row[mainRosterIndex]?.toString().trim().toLowerCase() === heroName.trim().toLowerCase()
            );


            if (rowIndex !== -1) {
                // Get the current Bonus and Notes values
                const currentBonus = sheetData[rowIndex][bonusIndex] || '0'; // Default to '0' if empty

                // Sanitize currentBonus to remove commas and non-numeric characters
                const sanitizedBonus = currentBonus.toString().replace(/,/g, '').replace(/[^0-9.-]+/g, '');
                const updatedBonus = Number(sanitizedBonus) + Number(newValue); // Add the new value

                // Update the Notes value
                const currentNotes = sheetData[rowIndex][notesIndex] || ''; // Default to empty string if empty
                const newNotesValue = `Bonus added: ${newValue}`;

                // Update the notes conditionally based on whether currentNotes is empty
                const updatedNotes = currentNotes ? `${currentNotes}\n${newNotesValue}` : newNotesValue; // Only add newline if currentNotes is not empty
                sheetData[rowIndex][notesIndex] = updatedNotes; // Update the notes in the array

                // Update the Bonus in the sheet
                const columnLetterBonus = String.fromCharCode(65 + bonusIndex); // Get column letter for Bonus
                const rangeBonus = `${columnLetterBonus}${rowIndex + 1}`; // Row index is 1-based for Sheets

                // Prepare the range for updating Notes
                const columnLetterNotes = String.fromCharCode(65 + notesIndex); // Get column letter for Notes
                const rangeNotes = `${columnLetterNotes}${rowIndex + 1}`; // Row index is 1-based for Sheets

                // Update the Bonus and Notes in the sheet
                await updateSheetValue(sheetName, rangeBonus, updatedBonus);
                await updateSheetValue(sheetName, rangeNotes, updatedNotes); // Ensure you update the notes in the sheet

                await interaction.editReply(`Successfully updated Bonus for hero: ${heroName}. New Bonus: ${updatedBonus}`);
                return; // Exit after processing the first hero found
            }
        }

        await interaction.editReply('No matching hero name found in the Pending Balance sheet.');
    } catch (error) {
        console.error(`Error in addBalance: ${error}`);
        await interaction.editReply('Failed to process the addBalance command.');
    }
};



const removeAdmin = async (interaction) => {
    // Acknowledge the interaction to prevent timeout
    await interaction.deferReply({ ephemeral: false });
    const senderDiscordID = interaction.user.id;
    if (!isAdmin(senderDiscordID, true)) {
        await interaction.editReply({ content: 'You are not Admin !', ephemeral: true });
        return;
    }
    try {
        const sheetName = 'BOT Control Center'; // Your sheet name
        const senderDiscordID = interaction.user.id;
        const targetDiscordID = interaction.options.getString('discordid'); // Get target Discord ID from slash command

        // Fetch the sheet data
        const sheetData = await getSheetData(sheetName);

        // Get the headers (first row)
        const headers = sheetData[0];

        // Find index of "Main Admin" column
        const mainAdminIndex = headers.indexOf('Main Admin');
        // Find index of "Admin List" column
        const adminListIndex = headers.indexOf('Admin List');

        // Check if the columns exist
        if (mainAdminIndex === -1 || adminListIndex === -1) {
            await interaction.editReply('Main Admin or Admin List column not found.');
            return;
        }

        // Check if the sender is a Main Admin
        const isMainAdmin = sheetData.slice(1).some((row) => row[mainAdminIndex] === senderDiscordID);

        if (!isMainAdmin) {
            await interaction.editReply('You are not authorized to remove admins.');
            return;
        }

        // Get the values in the "Admin List" column
        const adminListValues = sheetData.map(row => row[adminListIndex]);

        // Check if the targetDiscordID is in the list
        const adminIndex = adminListValues.indexOf(targetDiscordID);

        if (adminIndex === -1) {
            await interaction.editReply(`Discord ID: ${targetDiscordID} is not in the Admin List.`);
            return;
        }

        // Remove the target Discord ID from the Admin List column (clear the cell)
        const columnLetter = String.fromCharCode(65 + adminListIndex); // Get column letter (A, B, C...)
        const rowNumber = adminIndex + 1; // Convert the 0-based index to 1-based row number

        // Clear the value in the sheet
        await clearSheetCell(sheetName, `${columnLetter}${rowNumber}`); // Custom function to clear the specific cell

        // Send success message
        await interaction.editReply(`Successfully removed Discord ID: ${targetDiscordID} from the Admin List.`);
    } catch (error) {
        console.error(`Error in removeAdmin: ${error}`);
        await interaction.editReply('Failed to process the removeAdmin command.');
    }
};


const addAdmin = async (interaction) => {
    // Acknowledge the interaction to prevent timeout
    await interaction.deferReply({ ephemeral: false });
    const senderDiscordID = interaction.user.id;
    if (!isAdmin(senderDiscordID, true)) {
        await interaction.editReply({ content: 'You are not Admin !', ephemeral: true });
        return;
    }
    try {
        const sheetName = 'BOT Control Center'; // Your sheet name
        const senderDiscordID = interaction.user.id;
        const targetDiscordID = interaction.options.getString('discordid'); // Get target Discord ID from slash command

        // Fetch the sheet data
        const sheetData = await getSheetData(sheetName);

        // Get the headers (first row)
        const headers = sheetData[0];

        // Find index of "Main Admin" column
        const mainAdminIndex = headers.indexOf('Main Admin');
        // Find index of "Admin List" column
        const adminListIndex = headers.indexOf('Admin List');


        // Check if the columns exist
        if (mainAdminIndex === -1 || adminListIndex === -1) {
            await interaction.editReply('Main Admin or Admin List column not found.');
            return;
        }

        // Check if the sender is a Main Admin
        const isMainAdmin = sheetData.slice(1).some((row) => row[mainAdminIndex] === senderDiscordID);

        if (!isMainAdmin) {
            await interaction.editReply('You are not authorized to add admins.');
            return;
        }

        // Get the values in the "Admin List" column
        const adminListValues = sheetData.map(row => row[adminListIndex]);

        // Check if the targetDiscordID is already in the list
        if (adminListValues.includes(targetDiscordID)) {
            await interaction.editReply(`Discord ID: ${targetDiscordID} is already in the Admin List.`);
            return;
        }

        // Find the first empty cell in the "Admin List" column
        const lastFilledRowIndex = adminListValues.findIndex(value => !value); // Find the first empty cell

        // Determine the row index to append the new Discord ID
        const appendRowIndex = lastFilledRowIndex === -1 ? adminListValues.length + 1 : lastFilledRowIndex + 1;

        // Append the target Discord ID to the Admin List column
        const columnLetter = String.fromCharCode(65 + adminListIndex); // Get column letter (A, B, C...)
        await appendToSheet(sheetName, `${columnLetter}${appendRowIndex}`, targetDiscordID); // Append value in the next available row

        // Send success message
        await interaction.editReply(`Successfully added Discord ID: ${targetDiscordID} to the Admin List.`);
    } catch (error) {
        console.error(`Error in addAdmin: ${error}`);
        await interaction.editReply('Failed to process the addAdmin command.');
    }
};


const mycharacters = async (interaction) => {
    // Acknowledge the interaction to prevent timeout
    await interaction.deferReply();
    const heroNames = await findHeroNames(interaction.user.id);
    if (heroNames.length == 0) { interaction.editReply("You dont have Heros !"); return; }
    try {
        const discordID = interaction.user.id; // Get Discord ID from interaction

        // Fetch the hero names
        const heroNames = await findHeroNames(discordID);

        // Create an embed with the hero names
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)  // Set the color of the embed (red in this case)
            .setTitle('Wixana Guild')  // Title of the embed
            .setThumbnail(global.client.user.displayAvatarURL())  // Add a thumbnail (bot's avatar)
            .setDescription(`Here is a list of your heroes, ${interaction.user.globalName}:`);

        if (heroNames.length > 0) {
            // Add the hero names, each on a new line
            embed.addFields({ name: 'Heroes:', value: heroNames.join('\n'), inline: true });
        } else {
            // If no heroes are found, show this message
            embed.addFields({ name: 'Heroes:', value: 'No heroes found for your Discord ID.', inline: true });
        }

        if (interaction.guild) {
            await interaction.user.send({ embeds: [embed] });
            await interaction.editReply(`<@${interaction.user.id}> I have sent you a DM with your heroes.`);
        } else {
            await interaction.editReply({ embeds: [embed] });
        }

    } catch (error) {
        console.error(`Failed to send DM: ${error}`);
        await interaction.editReply('There was an error fetching your characters.');
    }
};


const balance = async (interaction) => {
    // Acknowledge the interaction to prevent timeout
    await interaction.deferReply({ ephemeral: false }); // Makes the initial reply visible only to the user

    try {
        const discordID = interaction.user.id;
        const heroNames = await findHeroNames(discordID);
        if (heroNames.length == 0) { interaction.editReply("You dont have Heros !"); return; }

        // Calculate balances
        const activeBalance = addCommas(await calculateActiveBlance(discordID) + "");
        const pendingBalance = addCommas(await calculatePendingBlance(discordID) + "");
        const lastMailedBalance = addCommas(await calculateLastMailedBalance(discordID) + "");
        const paymentCharacter = addCommas(await calculatePaymentCharacter(discordID) + "");

        // Create the embed
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Wixana Guild')
            .setDescription(`${interaction.user.globalName}'s balance in Wixana Guild as follows:`)
            .setThumbnail(global.client.user.displayAvatarURL())
            .addFields(
                { name: 'Active Balance', value: activeBalance, inline: true },
                { name: 'Pending Balance', value: pendingBalance, inline: true },
                { name: 'Last Mailed Balance', value: lastMailedBalance, inline: true },
                { name: 'Payment Character', value: paymentCharacter, inline: true },
            );


        // If the command was invoked in a channel, inform the user that the balance has been sent via DM
        if (interaction.guild) { // This will be true if the command was invoked in a guild (text channel)
            await interaction.user.send({ embeds: [embed] });
            await interaction.followUp(`<@${interaction.user.id}> I've sent your balance to your DMs`);
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    } catch (error) {
        console.error(`Failed to send DM: ${error}`);
        await interaction.editReply('There was an error fetching your balance.');
    }
};




const textFile = async (interaction) => {
    // Acknowledge the interaction to prevent timeout
    await interaction.deferReply({ ephemeral: false }); // Makes the initial reply visible only to the user


    try {
        const discordID = interaction.user.id; // Get Discord ID from interaction


        // Fetch hero names
        const heroNames = await findHeroNames(discordID);

        if (heroNames.length === 0) {

            await interaction.editReply('You are not in the list!');
            return;
        }

        const sheetColumnMap = {
            'Active Balance': {
                searchColumn: 'Main Roster',
                targetColumn: '',
            },
            'Pending Balance': {
                searchColumn: 'Main Roster',
                targetColumn: 'Notes',
            },
            'Balance Archive': {
                searchColumn: 'Main Roster',
                targetColumn: 'Notes',
            },
        };

        // Fetch data for the text file
        const data = await factor(sheetColumnMap, heroNames);
        const folder_path = path.join(__dirname, "..", "temp");
        const filePath = await createTextFile(data, discordID, folder_path);


        // If the command was invoked in a channel, inform the user
        if (interaction.guild) {
            await interaction.user.send({ files: [filePath] });
            await interaction.followUp(`<@${interaction.user.id}> I've sent your attendance file to your DMs`);
        } else {
            await interaction.followUp({ files: [filePath] });
        }
        // Delete the file after sending
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Failed to delete file: ${err}`);
            }
        });
    } catch (error) {
        console.error(`Failed to send DM: ${error}`);


        await interaction.editReply('There was an error processing your attendance request.');
    }
};
