const fs = require('fs');
const path = require('path');
const spreadsheetId = process.env.SHEETID;

exports.getSheetData = async (sheetName) => {

    const sheet = global.sheet;
    const auth = global.googleAuth;

    const range = `${sheetName}!A:Z`; 
    const response = await sheet.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range,
    });
    return response.data.values;
};


exports.findCellIndex = async (sheetName, searchColumnName, searchValues) => {
    try {
        // Get sheet data
        const sheetData = await this.getSheetData(sheetName);

        // Get the header row
        const headerRow = sheetData[1]; // Assuming headers are in row 2 (index 1)

        // Find the index of the search column
        const searchColumnIndex = headerRow.indexOf(searchColumnName);
        if (searchColumnIndex === -1) {
            throw new Error('Search column not found in the sheet.');
        }

        // Loop through the rows to find the search values
        for (let i = 2; i < sheetData.length; i++) { // Start from row 3 (index 2)
            const row = sheetData[i];

            // Check if the search value matches any in the searchValues array
            if (searchValues.includes(row[searchColumnIndex])) {
                // Return the cell reference (e.g., G3)
                const cellColumn = String.fromCharCode(65 + searchColumnIndex); // Convert index to letter (A=65, B=66, ...)
                const cellRow = i + 1; // Adjust for 1-based indexing
                return `${cellColumn}${cellRow}`; // Return the cell reference (e.g., G3)
            }
        }

        // Return null if no match is found
        return null;

    } catch (error) {
        console.error(`Error in findCellIndexByArrayValue: ${error.message}`);
        throw error;
    }
};



exports.updateSheetValue = async (sheetName, range, value) => {
    try {
        const sheet = global.sheet;
        const auth = global.googleAuth;

        const fullRange = `${sheetName}!${range}`; // Combine sheet name with the range

        const request = {
            spreadsheetId,
            range: fullRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[value]], // Wrap value in array to match Sheets format
            },
            auth
        };

        const response = await sheet.spreadsheets.values.update(request);

    } catch (error) {
        console.error(`Error in updateSheetValue: ${error}`);
        throw error;
    }
};


exports.clearSheetCell = async (sheetName, cellRange) => {

    const sheet = global.sheet;
    const auth = global.googleAuth;

    const request = {
        spreadsheetId,
        range: `${sheetName}!${cellRange}`,
        resource: {},
        auth
    };
    await sheet.spreadsheets.values.clear(request);
};



// Function to append data to a specific column in the sheet
exports.appendToSheet = async (sheetName, columnRange, value) => {


    const sheet = global.sheet;
    const auth = global.googleAuth;

    const range = `${sheetName}!${columnRange}`; // Define the range where to append data

    await sheet.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [[value]], // The value to add to the sheet
        },
    });
};

exports.findHeroNames = async (discordID) => {
    const sheet = global.sheet;
    const auth = global.googleAuth;
    const response = await sheet.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: 'Control Center!A1:Z1000'
    });


    const rows = response.data.values;
    if (rows.length === 0) {
        console.log('No data found.');
        return;
    }

    // Iterate over the rows to find the Discord ID
    let foundHeroes = [];
    rows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            if (cell === discordID) {
                // Found the Discord ID, now grab the 8 cells above
                const heroNames = [];
                for (let i = 1; i <= 8; i++) {
                    if (rows[rowIndex - i]) {
                        heroNames.push(rows[rowIndex - i][colIndex]);
                    }
                }
                foundHeroes = heroNames;
            }
        });
    });

    // Reverse the array and filter out empty or undefined values
    foundHeroes = foundHeroes.reverse().filter(name => name);

    return foundHeroes;
}


exports.isAdmin = async (discordID, mainAdmin = false) => {
    try {
        // Fetch the admin data from the "BOT Control Center" sheet
        const sheetName = 'BOT Control Center';
        const sheetData = await this.getSheetData(sheetName);

        // Assuming the first row contains column headers
        const adminListIndex = sheetData[0].indexOf('Admin List');
        const mainAdminListIndex = sheetData[0].indexOf('Main Admin');

        if (adminListIndex === -1 || mainAdminListIndex === -1) {
            throw new Error('Admin List or Main Admin List column not found in sheet.');
        }

        // Check if the user is in the admin list or main admin list
        const isAdmin = sheetData.some(row => row[adminListIndex]?.trim() === discordID);
        const isMainAdmin = sheetData.some(row => row[mainAdminListIndex]?.trim() === discordID);
        
        if (mainAdmin) {
            // If mainAdmin flag is true, return true only if the user is a main admin
            return isMainAdmin;
        }

        // Return true if the user is either an admin or a main admin
        return isAdmin || isMainAdmin;
    } catch (error) {
        console.error(`Error checking admin status: ${error}`);
        return false;
    }
};


exports.calculateActiveBlance = async (discordID) => {

    const sheet = global.sheet;
    const auth = global.googleAuth;
    const heroNames = await this.findHeroNames(discordID);

    const normalizedHeroNames = heroNames.map(name =>
        name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );


    const range = 'Active Balance!A:Z';
    const response = await sheet.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
        console.log('No data found.');
        return 0;
    }

    const headers = rows[1];
    const totalPotIndex = headers.indexOf('Total pot');
    const mainRosterIndex = headers.indexOf('Main Roster');


    let totalPotSum = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        const heroName = row[mainRosterIndex];
        if (!heroName) {
            continue;
        }

        const normalizedRowHeroName = heroName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (normalizedHeroNames.includes(normalizedRowHeroName)) {
            const potValue = parseFloat(row[totalPotIndex]?.replace(/,/g, '') || 0);
            totalPotSum += potValue;
        }
    }
    return totalPotSum;
}

exports.calculatePendingBlance = async (discordID) => {

    const sheet = global.sheet;
    const auth = global.googleAuth;
    const heroNames = await this.findHeroNames(discordID);

    const normalizedHeroNames = heroNames.map(name =>
        name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );


    const range = 'Pending Balance!A:Z';
    const response = await sheet.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
        console.log('No data found.');
        return 0;
    }

    const headers = rows[1];
    const totalPotIndex = headers.indexOf('Total pot');
    const mainRosterIndex = headers.indexOf('Main Roster');


    let totalPotSum = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        const heroName = row[mainRosterIndex];
        if (!heroName) {
            continue;
        }

        const normalizedRowHeroName = heroName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (normalizedHeroNames.includes(normalizedRowHeroName)) {
            const potValue = parseFloat(row[totalPotIndex]?.replace(/,/g, '') || 0);
            totalPotSum += potValue;
        }
    }
    return totalPotSum;
}


exports.calculateLastMailedBalance = async (discordID) => {

    const sheet = global.sheet;
    const auth = global.googleAuth;
    const heroNames = await this.findHeroNames(discordID);

    const normalizedHeroNames = heroNames.map(name =>
        name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );


    const range = 'Balance Archive!A:Z';
    const response = await sheet.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
        console.log('No data found.');
        return 0;
    }

    const headers = rows[1];
    const totalPotIndex = headers.indexOf('Total pot');
    const mainRosterIndex = headers.indexOf('Main Roster');


    let totalPotSum = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        const heroName = row[mainRosterIndex];
        if (!heroName) {
            continue;
        }

        const normalizedRowHeroName = heroName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (normalizedHeroNames.includes(normalizedRowHeroName)) {
            const potValue = parseFloat(row[totalPotIndex]?.replace(/,/g, '') || 0);
            totalPotSum += potValue;
        }
    }
    return totalPotSum;
}

exports.calculatePaymentCharacter = async (discordID) => {
    const sheet = global.sheet;
    const auth = global.googleAuth;
    const heroNames = await this.findHeroNames(discordID);

    // Normalize hero names to match them in the spreadsheet
    const normalizedHeroNames = heroNames.map(name =>
        name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );

    const range = 'Pending Balance!A:Z';
    const response = await sheet.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
        console.log('No data found.');
        return null; // Return null if no data found
    }

    // Get headers from the sheet
    const headers = rows[1];
    const characterPayIndex = headers.indexOf('Pay Character');
    const mainRosterIndex = headers.indexOf('Main Roster');

    // Ensure the indices are valid
    if (characterPayIndex === -1 || mainRosterIndex === -1) {
        console.log('Required columns not found.');
        return null;
    }

    // Initialize variable to store the matched Pay Character value
    let payCharacter = null;

    // Loop through each row to find a matching hero name
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const heroName = row[mainRosterIndex]; // Get hero name from Main Roster column

        if (!heroName) continue;

        // Normalize the hero name from the sheet for comparison
        const normalizedRowHeroName = heroName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // If the hero name matches any name from the heroNames list
        if (normalizedHeroNames.includes(normalizedRowHeroName)) {
            const payCharacterValue = row[characterPayIndex];

            if (payCharacterValue) {
                // If it's a number, use parseFloat; otherwise, keep it as is
                payCharacter = isNaN(payCharacterValue) ? payCharacterValue : parseFloat(payCharacterValue);
                break; // Exit loop after the first match
            }
        }
    }

    return payCharacter;
};

exports.factor = async (sheetColumnMap, heroNames) => {
    try {
        const sheet = global.sheet;
        const auth = global.googleAuth;

        let finalData = []; // To store results across multiple sheets

        // Normalize hero names for matching across all sheets
        const normalizedHeroNames = heroNames.map(name =>
            name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        );

        // Loop through each sheet name and its corresponding search/target column names
        for (const [sheetName, columnMap] of Object.entries(sheetColumnMap)) {
            const searchColumn = columnMap.searchColumn; // The column where hero names are located
            const targetColumn = columnMap.targetColumn; // The column from where we want to retrieve data or "" for full row

            const range = `${sheetName}!A:Z`; // Adjust range to fetch enough columns
            const response = await sheet.spreadsheets.values.get({
                auth,
                spreadsheetId,
                range,
            });

            const rows = response.data.values;

            if (!rows || rows.length === 0) {
                continue;
            }

            // Extract headers and determine column indices
            const headers = rows[1];
            const searchColIndex = headers.indexOf(searchColumn); // Index of the column where we search for hero names
            const targetColIndex = targetColumn ? headers.indexOf(targetColumn) : headers.length - 1; // If targetColumn is empty, go to the end of the row

            if (searchColIndex === -1) {
                continue;
            }

            // Loop through rows to find hero matches and fetch relevant data
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];

                const normalizedRowHeroName = row[searchColIndex]?.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                // If the hero name matches
                if (normalizedHeroNames.includes(normalizedRowHeroName)) {
                    const rowData = row.slice(0, targetColIndex + 1); // Fetch all columns from left to the target column (or end)

                    const dataObject = {};

                    function containsNumber(str) {
                        return /\d/.test(str);
                    }
                    rowData.forEach((data, index) => {
                        if (
                            !containsNumber(headers[index])
                            ||
                            containsNumber(headers[index]) && data != null && data != "" && data != undefined
                        ) {
                            dataObject[headers[index]] = data;
                        }
                    });

                    finalData.push({
                        sheet: sheetName,
                        hero: row[searchColIndex], // The hero name
                        data: dataObject,
                    });
                }
            }
        }

        if (finalData.length === 0) {
            return [];
        }

        return finalData;

    } catch (error) {
        console.error(`Error fetching data: ${error}`);
        return [];
    }
};



exports.createTextFile = (data, fileName, targetFolder) => {
    // Ensure the file has the .txt extension
    if (!fileName.endsWith('.txt')) {
        fileName += '.txt';
    }

    const folderPath = path.resolve(targetFolder);

    // Create the folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, fileName);

    // Check if the file exists, if so, clear its content
    if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, ''); // Truncate the file content to make it empty
    }

    let fileContent = '';

    // Function to center text with padding based on the width of the content
    const centerText = (text, width) => {
        const padding = Math.floor((width - text.length) / 2);
        return ' '.repeat(padding) + text + ' '.repeat(padding);
    };

    // Group data by sheet name (merge entries for the same sheet)
    const groupedData = data.reduce((acc, sheetData) => {
        if (!acc[sheetData.sheet]) {
            acc[sheetData.sheet] = [];
        }
        acc[sheetData.sheet].push(sheetData);
        return acc;
    }, {});

    // Calculate the maximum row width for the entire file
    let maxWidth = 0;
    Object.keys(groupedData).forEach(sheetName => {
        const sheetEntries = groupedData[sheetName];
        const headers = Object.keys(sheetEntries[0].data);
        const columnWidths = headers.map(header =>
            Math.max(header.length, ...sheetEntries.map(entry => (entry.data[header] || '').length))
        );
        const totalWidth = columnWidths.reduce((a, b) => a + b, 0) + headers.length * 3; // Total width of the row
        if (totalWidth > maxWidth) {
            maxWidth = totalWidth;
        }
    });

    // Center the "WIXANA GUILD" title based on the widest row
    fileContent += centerText('*** WIXANA GUILD ***', maxWidth).toUpperCase() + '\n\n\n';

    // Iterate over each sheet's data (grouped by sheet name)
    Object.keys(groupedData).forEach(sheetName => {
        const sheetEntries = groupedData[sheetName];

        // Extract all headers for calculating width
        const headers = Object.keys(sheetEntries[0].data);

        // Calculate column widths based on the maximum length of the values in each column
        const columnWidths = headers.map(header =>
            Math.max(header.length, ...sheetEntries.map(entry => (entry.data[header] || '').length))
        );

        // Calculate total row width for centering the sheet name
        const totalWidth = columnWidths.reduce((a, b) => a + b, 0) + headers.length * 3;

        // Center the sheet name based on the calculated row width
        fileContent += centerText(`--- ${sheetName} ---`, totalWidth) + '\n\n';

        // Define a function to pad the values for alignment
        const padString = (str, length) => str.padEnd(length, ' ');

        // Generate the header row with proper spacing
        fileContent += headers.map((header, colIndex) => padString(header, columnWidths[colIndex])).join(' | ') + '\n';
        fileContent += '-'.repeat(totalWidth) + '\n'; // Header separator line

        // Generate the rows with proper spacing
        sheetEntries.forEach(sheetEntry => {
            const row = headers.map((header, colIndex) =>
                padString(sheetEntry.data[header] || '', columnWidths[colIndex])
            ).join(' | ');
            fileContent += row + '\n';
        });

        // Add some extra spacing between sheets
        fileContent += '\n\n';
    });

    // Write the generated content to the file
    fs.writeFileSync(filePath, fileContent);
    return filePath;

};