const { findHeroNames } = require('@root/app/utils/sheet.js');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { isAdmin } = require('../utils/sheet');

exports.createGiveaway = async (interaction) => {
    try {
        await interaction.deferReply();
        const senderDiscordID = interaction.user.id;

        if (!isAdmin(senderDiscordID)) {
            await interaction.editReply({ content: 'You are not Admin!', ephemeral: true });
            return;
        }

        const days = interaction.options.getInteger('days') || 0;
        const hours = interaction.options.getInteger('hours') || 0;
        const minutes = interaction.options.getInteger('minutes') || 0;
        const prize = interaction.options.getString('prize');

        if (!prize) {
            await interaction.editReply({ content: 'Please provide a valid prize.' });
            return;
        }

        const now = new Date();
        const endTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000 + minutes * 60 * 1000);

        if (endTime <= now) {
            await interaction.editReply({ content: 'The end time must be in the future.' });
            return;
        }

        const remainingTimeMs = endTime - now;
        const readableEndTime = endTime.toLocaleString('en-GB', {
            timeZone: 'Asia/Tehran',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        let participantsCount = 0;

        const embed = new EmbedBuilder()
            .setTitle(`🎉 Giveaway: ${prize}`)
            .setDescription(`Click the button below to join the giveaway!\nEnds at: **${readableEndTime}** (Tehran Time)\nParticipants: **${participantsCount}**`)
            .setColor(0x00FF00)
            .setTimestamp(endTime);

        const button = new ButtonBuilder()
            .setCustomId('giveaway-entry')
            .setLabel('Join the Giveaway 🎟️')
            .setStyle(ButtonStyle.Primary);

        const actionRow = new ActionRowBuilder().addComponents(button);

        // Edit the deferred reply with the embed and button
        let message = await interaction.editReply({
            embeds: [embed],
            components: [actionRow],
            ephemeral: false,
        });

        await interaction.followUp({
            content: '@everyone 🎉 The giveaway has started! Click the button to enter!',
            ephemeral: false,
        });

        const participants = new Set();

        const createCollector = (remainingTime) => {
            const collectorTime = Math.min(remainingTime, 840000); // 14 minutes to avoid expired interactions.

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: collectorTime,
            });

            collector.on('collect', async (buttonInteraction) => {
                await onClick(buttonInteraction, participants, message);
            });

            collector.on('end', () => {
                const newRemainingTime = endTime - new Date(); // Calculate remaining time
                if (newRemainingTime > 0) {
                    createCollector(newRemainingTime); // Recreate collector if still time remaining
                }
            });
        };

        createCollector(remainingTimeMs);

        setTimeout(() => {
            onEnd(message, participants, prize); // Pass the message instead of interaction
        }, remainingTimeMs);

    } catch (error) {
        console.error('Error in createGiveaway function:', error);
        await interaction.followUp({ content: 'There was an error starting the giveaway.' });
    }
};

const onClick = async (buttonInteraction, participants, message) => {
    try {
        if (buttonInteraction.replied || buttonInteraction.deferred) {
            return; // Skip if the interaction has already been replied to
        }

        await buttonInteraction.deferReply({ ephemeral: true }); // Deferring the reply to allow more processing time

        const userId = buttonInteraction.user.id;

        if (participants.has(userId)) {
            await buttonInteraction.editReply({
                content: 'You have already joined the giveaway!',
                ephemeral: true,
            });
        } else {
            participants.add(userId);
            const participantsCount = participants.size;

            // Convert the timestamp back to a readable date string
            const endTime = new Date(message.embeds[0].timestamp);
            const readableEndTime = endTime.toLocaleString('en-GB', {
                timeZone: 'Asia/Tehran',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });

            // Update the embed to show the new participant count and correct time format
            const updatedEmbed = EmbedBuilder.from(message.embeds[0])
                .setDescription(`Click the button below to join the giveaway!\nEnds at: **${readableEndTime}** (Tehran Time)\nParticipants: **${participantsCount}**`);

            await message.edit({ embeds: [updatedEmbed] });

            await buttonInteraction.editReply({
                content: 'You have successfully entered the giveaway!',
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error('Error in collecting button interaction:', error);
    }
};

const onEnd = async (message, participants, prize) => {
    try {
        if (participants.size === 0) {
            await message.channel.send('@everyone No one entered the giveaway.');
        } else {
            const winnerId = [...participants][Math.floor(Math.random() * participants.size)];
            const winner = await message.guild.members.fetch(winnerId);
            await message.channel.send(`@everyone 🎉 The giveaway has ended! Congratulations <@${winnerId}>, you won **${prize}**! 🏆`);
        }

        // Disable the button after the giveaway ends
        const disabledButton = new ButtonBuilder()
            .setCustomId('giveaway-entry')
            .setLabel('Join the Giveaway 🎟️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true); // Disable the button

        const updatedActionRow = new ActionRowBuilder().addComponents(disabledButton);

        // Correctly format the timestamp to display it in a human-readable format
        const endTime = new Date(message.embeds[0].timestamp); // Convert the timestamp to a Date object
        const readableEndTime = endTime.toLocaleString('en-GB', {
            timeZone: 'Asia/Tehran',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });

        const participantsCount = participants.size;

        // Update the embed description to include the properly formatted time and participant count
        const embedDescription = `Click the button below to join the giveaway!\nEnds at: **${readableEndTime}** (Tehran Time)\nParticipants: **${participantsCount}**\n\n**The giveaway has ended!**`;

        const updatedEmbed = EmbedBuilder.from(message.embeds[0])
            .setDescription(embedDescription);

        // Edit the message to disable the button and update the embed
        await message.edit({
            embeds: [updatedEmbed],
            components: [updatedActionRow],
        });

    } catch (error) {
        console.error('Error in ending giveaway:', error);
        await message.channel.send('There was an error ending the giveaway.');
    }
};

