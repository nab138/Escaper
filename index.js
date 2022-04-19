"use strict";
// Import utilities
const createEscapeRoom = require("./utils/escapeRoomCreator");
const {Client, Intents}= require('discord.js');
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]});

const { token } = require('./token.json');

let t0 = performance.now()

client.escapeRooms = new Map();
client.creationMenus = new Map();
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag} in ${Math.round((performance.now() - t0))}ms`);
})

client.on('interactionCreate', async (interaction) => {
    if(interaction.isCommand()){
        if(interaction.commandName === 'new'){
            if(!client.creationMenus.has(interaction.guild.id) && !client.escapeRooms.has(interaction.guild.id)){
                createEscapeRoom(interaction);
            } else if(client.escapeRooms.has(interaction.guild.id)) {
                interaction.reply("There is already a game running in this server. Please wait for it to finish before creating a new one.");
            } else {
                interaction.reply("There is already a room being created in this server. Please wait for it to finish before creating a new one.");
            }
        }
    }
})
client.on('messageCreate', async (message) => {
    if(message.author.id == '526776599505403904' && message.content.startsWith('reset')){
        try {
        for(const channel of message.guild.channels.cache.values()){
            if(channel.type != 'GUILD_TEXT' && channel.name != "Waiting Room"){
                channel.delete();
            }
            await new Promise((resolve) => setTimeout(resolve, parseInt(message.content.split(" ")[1])));
        }
        client.escapeRooms.get("957275107699593276").collector.stop()
    } catch (error) {
        console.log(error);
    }
    } else if (message.author.id == '526776599505403904' && message.content.startsWith('eval')){
        try {
            let command = message.content.split(" ");
            command.shift()
            let result = await eval(`(async () => {${command.join(" ")}})()`)
            message.channel.send(`\`\`\`js\n${result}\n\`\`\``);
        } catch (error) {
            console.log(error);
        }
    }
})
console.log("Starting bot...");
client.login(token)