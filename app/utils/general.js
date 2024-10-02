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
    return name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}