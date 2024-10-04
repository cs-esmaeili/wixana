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
        const col = match[1]; // Extract the column letters (e.g., "C")
        const row = match[2]; // Extract the row number (e.g., "10")
        return { col, row: parseInt(row, 10) }; // Return as an object
    } else {
        throw new Error("Invalid cell location format");
    }
}

let cooldown = null;
exports.checkCooldown = () => {
    if (cooldown != null) {
        const now = Date.now();

        // Check if the current time is less than the cooldown time plus 15000 milliseconds
        if (now < cooldown + 6000) {
            const timeLeft = (cooldown + 6000 - now) / 1000; // Calculate remaining time in seconds
            return { block: true, time: timeLeft.toFixed(1) }
        }
    }

    // Set the new cooldown time to the current time
    cooldown = Date.now();
    return { block: false, time: 0 }
}