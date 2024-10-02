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