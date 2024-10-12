const { Client, IntentsBitField, Partials, REST, Routes } = require('discord.js');
require('dotenv').config();

exports.discordLogIn = async () => {
    const client = new Client({
        intents: [
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.MessageContent,
            IntentsBitField.Flags.GuildMessages,
            IntentsBitField.Flags.DirectMessages
        ],
        partials: [Partials.Channel]
    });

    const readyPromise = new Promise((resolve) => {
        client.on('ready', async () => {
            await registerCommands(client);  // Register slash commands when the bot is ready
            console.log(`Discord logged in`);
            resolve();
        });
    });

    try {
        await client.login(process.env.TOKEN); // Login with the bot token
        await readyPromise;
        global.client = client;

    } catch (error) {
        console.error('Error logging in:', error);
    }
};

// Function to register slash commands
const registerCommands = async (client) => {
    const commands = [
        {
            name: "deathroll",
            description: "Challenge someone to a Deathroll game.",
            options: [
                {
                    type: 6,
                    name: "target",
                    description: "The player you want to challenge to a Deathroll.",
                    required: true
                },
                {
                    name: 'price',
                    description: 'Price',
                    type: 10,
                    required: true,
                },
            ]
        },
        {
            name: 'addadmin',
            description: 'Add an admin with a Discord ID',
            options: [
                {
                    name: 'discordid',
                    description: 'Discord ID of the admin',
                    type: 3,
                    required: true,
                },
            ],
        },
        {
            name: 'roll',
            description: 'Random number ',
        },
        {
            name: 'removeadmin',
            description: 'Remove an admin with a Discord ID',
            options: [
                {
                    name: 'discordid',
                    description: 'Discord ID of the admin',
                    type: 3,
                    required: true,
                },
            ],
        },
        {
            name: 'addbalance',
            description: 'AddBalance for Person',
            options: [
                {
                    name: 'discordid',
                    description: 'Discord ID to add Blance',
                    type: 3,
                    required: true,
                },
                {
                    name: 'value',
                    description: 'Blance Value to add',
                    type: 10,
                    required: true,
                },
            ],
        },
        {
            name: 'transferbalance',
            description: 'Transferbalance between Persons',
            options: [
                {
                    name: 'value',
                    description: 'Blance Value',
                    type: 10,
                    required: true,
                },
                {
                    name: 'from',
                    description: 'Discord ID to decrease Blance',
                    type: 3,
                    required: true,
                },
                {
                    name: 'to',
                    description: 'Discord ID to increase Blance',
                    type: 3,
                    required: true,
                },
            ],
        },
        {
            name: 'creategiveaway',
            description: 'Create Giveaway',
            options: [
                {
                    name: 'days',
                    description: 'Blance Value Like : ',
                    type: 4,
                    required: true,
                },
                {
                    name: 'hours',
                    description: 'Blance Value Like : ',
                    type: 4,
                    required: true,
                },
                {
                    name: 'minutes',
                    description: 'Blance Value Like : ',
                    type: 4,
                    required: true,
                },
                {
                    name: 'prize',
                    description: 'Prize for Giveaway',
                    type: 3,
                    required: true,
                },
            ],
        },
        {
            name: 'createlottery',
            description: 'Create a lottery',
            options: [
                {
                    name: 'days',
                    description: 'Number of days for the lottery',
                    type: 4,
                    required: true,
                },
                {
                    name: 'hours',
                    description: 'Number of hours for the lottery',
                    type: 4,
                    required: true,
                },
                {
                    name: 'minutes',
                    description: 'Number of minutes for the lottery',
                    type: 4,
                    required: true,
                },
                {
                    name: 'ticketprice',
                    description: 'Price of a ticket for the lottery',
                    type: 10,
                    required: true,
                },
                {
                    name: 'description',
                    description: 'Description of the lottery',
                    type: 3,
                    required: true,
                },
                {
                    name: 'allownumbertickets',
                    description: 'Max tickets allowed per user',
                    type: 4,
                    required: true,
                },
            ],
        },
        {
            name: 'mycharacters',
            description: 'List your heroes',
        },
        {
            name: 'balance',
            description: 'Check your balance',
        },
        {
            name: 'attendance',
            description: 'Get attendance in a file',
        },

    ];
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
};
