const { google } = require("googleapis");
const path = require('path');
const projectRoot = path.dirname(require.main.filename);
require('dotenv').config();

exports.googleLogIn = async () => {


    const auth = new google.auth.GoogleAuth({
        keyFile : projectRoot + '/keys/credentials.json',
        scopes: process.env.GOOGLEURL,
    });
    
    try {
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: "v4", auth: client });

        global.sheet = googleSheets;
        global.googleAuth = auth;
    } catch (error) {
        console.error('Error Google logging in:', error);
    }
}
