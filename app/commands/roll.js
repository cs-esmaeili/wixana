exports.roll = async (message) => {
    try {
        await message.deferReply();
        const rnd = Math.floor(Math.random() * 101);
        const userTag = message.user ? `<@${message.user.id}>` : message.author ? `<@${message.author.id}>` : '';
        await message.editReply(`${userTag}, your Random number is: ${rnd}`);
    } catch (error) {
        console.log("error in roll : " + error);
    }
};
