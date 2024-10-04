const { normalizeHeroName } = require("./general")
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


exports.findCol = async (sheetName, headerName, targetRow) => {
    try {
        const sheetData = await exports.getSheetData(sheetName);
        const headerRow = sheetData[1];
        const headerIndex = headerRow.indexOf(headerName);
        if (headerIndex === -1) {
            throw new Error('Header not found in the sheet.');
        }
        if (targetRow < 3 || targetRow > sheetData.length) {
            throw new Error('Target row is out of range.');
        }
        const cellValue = sheetData[targetRow - 1][headerIndex];
        if (cellValue === undefined) {
            return null;
        }
        const cellColumn = String.fromCharCode(65 + headerIndex);
        const cellRow = targetRow;

        return {
            index: `${cellColumn}${cellRow}`,
            value: cellValue
        };

    } catch (error) {
        console.error(`Error in findColl: ${error.message}`);
        throw error;
    }
};

exports.findCell = async (sheetName, searchColumnName, searchValues) => {
    try {
        const sheetData = await this.getSheetData(sheetName);
        const headerRow = sheetData[1];
        const searchColumnIndex = headerRow.indexOf(searchColumnName);
        if (searchColumnIndex === -1) {
            throw new Error('Search column not found in the sheet.');
        }
        for (let i = 2; i < sheetData.length; i++) {
            const row = sheetData[i];

            if (searchValues.includes(normalizeHeroName(row[searchColumnIndex]))) {
                const cellColumn = String.fromCharCode(65 + searchColumnIndex);
                const cellRow = i + 1;
                return {
                    index: `${cellColumn}${cellRow}`,
                    value: row[searchColumnIndex]
                };
            }
        }
        return null;
    } catch (error) {
        console.error(`Error in findCellIndexByArrayValue: ${error.message}`);
        throw error;
    }
};

exports.findCellByValue = async (sheetName, searchValue) => {
    try {
        const sheetData = await this.getSheetData(sheetName); // Fetch all sheet data

        // Loop through each row in the sheet
        for (let rowIndex = 0; rowIndex < sheetData.length; rowIndex++) {
            const row = sheetData[rowIndex];

            // Loop through each cell in the row
            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const cellValue = row[colIndex];

                // If the value matches the searchValue, return the cell reference
                if (normalizeHeroName(cellValue) === normalizeHeroName(searchValue)) {
                    const cellColumn = String.fromCharCode(65 + colIndex); // Convert column index to letter (A, B, C, etc.)
                    const cellRow = rowIndex + 1; // Rows are 1-indexed in Excel/Sheets
                    return {
                        index: `${cellColumn}${cellRow}`,
                        value: cellValue,
                    };
                }
            }
        }

        return null; // Return null if no match is found
    } catch (error) {
        console.error(`Error in findCellByValue: ${error.message}`);
        throw error;
    }
};

exports.findCellByIndex = async (sheetName, cellIndex) => {
    try {
        const sheet = global.sheet;
        const auth = global.googleAuth;

        const range = `${sheetName}!${cellIndex}`; // Specify the cell by its index, e.g., 'G3'

        const response = await sheet.spreadsheets.values.get({
            auth,
            spreadsheetId, // Assuming this is globally available
            range,
        });

        const cellValue = response.data.values ? response.data.values[0][0] : null;

        return {
            index: cellIndex,
            value: cellValue,
        };
    } catch (error) {
        console.error(`Error in getCellByIndex: ${error.message}`);
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
