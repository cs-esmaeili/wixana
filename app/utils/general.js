exports.addCommas = (number) => {
    if (number)
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return null
}
exports.removeCommas = (numberString) => {
    if (numberString) {
        return numberString.replace(/,/g, ""); // Remove all commas
    }
    return null; // Return null if the input is falsy
};

exports.normalizeHeroName = (name) => {
    if (typeof name !== 'string') {
        return ''; // Or handle the undefined case as needed, e.g., return null or throw an error
    }

    return name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

exports.separateCellLocation = (cell) => {
    if (cell == null) {
        return null;
    }
    // Use a regular expression to match the column letters and row numbers
    const match = cell.match(/^([A-Z]+)(\d+)$/);
    if (match) {
        const column = match[1]; // Extract the column letters (e.g., "C")
        const row = match[2]; // Extract the row number (e.g., "10")
        return { column, row: parseInt(row, 10) }; // Return as an object
    } else {
        throw new Error("Invalid cell location format");
    }
}
