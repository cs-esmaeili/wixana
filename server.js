require('module-alias/register');
require('dotenv').config();

const { discordLogIn } = require('./app/controller/DiscordAuth');
const { botInitListeners } = require('./app/controller/Listeners');
const { googleLogIn } = require('./app/controller/googleAuth');

(async () => {
    await googleLogIn();
    await discordLogIn();
    await botInitListeners();
})();