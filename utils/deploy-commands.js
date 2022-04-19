const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { token } = require('../token.json');
const games = require('../games/games.json').games;
const commands = [
	new SlashCommandBuilder()
    .setName('new')
    .setDescription('Create a new escape room')
    .addStringOption(option => {
        for(const game of games){
            option.addChoice(game.name, game.id);
        }
        return option.setName("game")
        .setRequired(true)
        .setDescription("The escape room you want to play")
    })
    .addIntegerOption(option => {
        return option.setName("time")
        .setRequired(false)
        .setDescription("The time limit, in minutes. If unspecified, the game will time out after 2 hours of inactivity.")
        .setMaxValue(300)
        .setMinValue(20)
    })
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands("957263223646740520", "957275107699593276"), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);