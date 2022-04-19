# Escaper
An escape room framework for discord bots.

## About
This is more of a proof on concept then anything. There is very little content here, and this is mostly just a framework. Examples for how to create escape rooms are in /games. If you make an escape room, it would be awesome if you could contribute it but you can also keep it for yourself.

The bot basically needs its own dedicated guild. You should delete all channels in this guild (except for one text channel) and invite the bot. Then use the slash commands to start an escape room. It will create a waiting room VC and you should get all players into this channel. Then, press the start button. The bot will create a bunch of channels, where the escape room will take place. Get all users to click the start button, then the game will take place! Users can type different commands into the text channel to observe their surroundings, solve puzzles, and list found things. The results of these commands will be different based on what voice channel the runner is in.

This hasn't been thourougly tested, but is fairly stable.

## Running

1. Clone the project and enter the folder `git clone https://github.com/nab138/Escaper/ && cd Escaper`
2. Install dependencies `yarn` (or `npm install`, but remove yarn.lock if doing this)
3. Create a bot on https://discord.com/developers/applications
4. Copy the bot's token
5. Paste it into a file named token.json 
```json
{
  "token" : "your token here"
}
```
6. Deploy slash commands `node utils/deploy-commands.js` (Do this any time you add a new escape room)
7. Start the bot with `node .`
