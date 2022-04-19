"use strict";
const {MessageActionRow, MessageButton, MessageEmbed} = require('discord.js');
const games = require('../games/games.json').games;
module.exports = async (interaction) => {
    let wRoom = (interaction.guild.channels.cache.size == 2 && interaction.guild.channels.cache.find(channel => channel.type === 'GUILD_VOICE' && channel.name === 'Waiting Room'))
    if (interaction.guild.channels.cache.size > 1 && !wRoom) {
        interaction.reply("Please delete all channels and categories before creating a new escape room. Only leave one channel, the one you're in right now.");
        return;
    } else if(interaction.client.escapeRooms.has(interaction.guild.id)){
        interaction.reply("There is already a game running in this server. Please wait for it to finish before creating a new one.");
        return;
    } else {            
        if(wRoom){
            interaction.client.creationMenus.set(interaction.guild.id, true);
            return createRoom(interaction);
        }
        interaction.guild.channels.create('Waiting Room', { reason: `${interaction.user.tag} started a new ecaspe room game.`, type: "GUILD_VOICE" })
        .then(() => {
            interaction.client.creationMenus.set(interaction.guild.id, true);
            createRoom(interaction)
        })
        //createRoom(interaction);
    }
}
function createRoom(interaction){
    const row = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('ready')
            .setLabel('Continue')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle('DANGER'),
    );
    let game = games.find(game => game.id == interaction.options.getString('game'));
    const embed = new MessageEmbed()
        .setTitle(`${interaction.user.tag} started a new escape room game.`)
        .setDescription(`You have chosen to play: ${game.name}!\n\nHost, tell all players (Including you) to join the waiting room. If a player is not in the waiting room when you click continue they will not be allowed to participate. (INCLUDING YOU!!!)`)
        .setAuthor({name: interaction.client.user.tag, iconURL: interaction.client.user.displayAvatarURL({dynamic: true})})
    interaction.reply({ embeds: [embed], components: [row]})
        let filter = (m) => m.user.id === interaction.user.id;
        let collector = interaction.channel.createMessageComponentCollector({componentType: "BUTTON", filter, max: 1, idle: 5 * 60000});
        collector.on('collect', async i => {
            if (i.customId === 'ready') {
                let players = Array.from((await interaction.guild.channels.cache.find(channel => channel.type === 'GUILD_VOICE' && channel.name == "Waiting Room"))?.members.values())
                
                if(game.min <= players.length && players.length <= game.max){
                    let EscapeRoom = require(`./escapeRoom.js`);
                    let room = new EscapeRoom(players, interaction.options.getInteger('time'), game, interaction);
                    await i.update({ embeds: [], content: 'Creating room...', components: [] });
                    await room.createRoles();
                    await room.createChannels();
                    const row2 = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('start')
                            .setLabel('Ready')
                            .setStyle('PRIMARY'),
                    )
                    let msg = await interaction.channel.send({ content: 'Room created!\nWhen all players press The Ready button, the game will begin.', components: [row2] });
                    let maxPressed = players.length;
                    let pressedPlayers = []
                    let filter = (m) => { m.deferUpdate(); return (players.some(player => player.user.id === m.user.id) && (!pressedPlayers.includes(m.user.id)))};
                    let collector = interaction.channel.createMessageComponentCollector({componentType: "BUTTON", filter, max: maxPressed, idle: 5 * 60000});
                    collector.on('collect', async i => {
                        if (i.customId === 'start') {
                            pressedPlayers.push(i.user.id);
                        }
                    })
                    collector.on('end', async (collected) => {
                        if(collected.size < maxPressed){
                            await interaction.channel.send({ content: 'Not all players pressed ready. Game cancelled.', components: [] });
                            room = null;
                        } else {
                            interaction.client.creationMenus.delete(interaction.guild.id);
                            interaction.client.escapeRooms.set(interaction.guild.id, room);
                            interaction
                            await room.start();
                            await msg.edit({ embeds: [], content: 'Game started!', components: [] });
                            room.handleCommands();
                        }
                    })
                } else {
                    interaction.client.creationMenus.delete(interaction.guild.id);
                    interaction.editReply({embeds: [], content:`Please make sure there are between ${game.min} and ${game.max} players in the waiting room.`, components: []});
                    return;
                }
            } else {
                interaction.editReply({embeds: [], content: 'Cancelled', components: []});
                interaction.client.creationMenus.delete(interaction.guild.id);
            }
        });
        // If collecter ends with no button presses, cancel the room
        collector.on('end', async (collected) => {
            if(collected.size == 0){
                interaction.editReply({embeds: [], content: 'Cancelled', components: []});
                interaction.client.creationMenus.delete(interaction.guild.id);
            }
        }
        );
}
