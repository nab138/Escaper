const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require('discord.js');

class EscapeRoom {
    constructor (players, time, game, interaction){
        this.host = interaction.user;
        this.players = players;
        this.time = time;
        this.startTime = Date.now();
        this.game = game;
        this.evidence = require(`../games/${this.game.id}.json`);
        this.guild = interaction.guild;
        this.interaction = interaction;
        this.client = interaction.client;
        this.channel = interaction.channel;
        this.allPuzzles = [];
        this.foundEvidence = [];
        this.foundPuzzles = [];
        this.solvedPuzzles = [];
        this.collector = null;
        this.role = "0";
    }
    observe(message){
        return new Promise(async (resolve, reject) => {
            try {
                // figure out what voice channel the member is in
                let channel = message.member.voice.channel;
                if(!channel){
                    return message.reply("You need to be in a voice channel to do that.");
                }
                let room = channel.name;
                if(!this.evidence.rooms[room]){
                    return message.reply("That room doesn't exist.");
                }
                const evidenceEmbed = new MessageEmbed()
                    .setTitle(`${channel.name} Observations`)
                    .setDescription(`Puzzles are marked with *`);
                    
                let evident = [];
                let puzz = [];
                if(this.evidence.rooms[room].puzzles){
                this.evidence.rooms[room].puzzles.forEach(puzzle => {
                    if(!puzzle.requires){
                        if(!this.foundPuzzles.includes(puzzle)){
                            this.foundPuzzles.push(puzzle);
                            if(!this.solvedPuzzles.includes(puzzle.id)){
                                puzz.push(puzzle)
                            }
                        }
                        
                    } else {
                        let met = 0;
                        puzzle.requires.forEach(req => {
                            if(this.solvedPuzzles.includes(req)){
                                met++;
                            }
                        })
                        if(met === puzzle.requires.length){
                            if(!this.foundPuzzles.includes(puzzle)){
                                this.foundPuzzles.push(puzzle);
                                if(!this.solvedPuzzles.includes(puzzle.id)){
                                    puzz.push(puzzle)
                                }
                            }
                        }
                    }
                })
            }
            if(this.evidence.rooms[room].evidence){
                this.evidence.rooms[room].evidence.forEach(evidence => {
                    if(!evidence.requires){
                        if(!this.foundEvidence.includes(evidence)){
                            this.foundEvidence.push(evidence);
                            evident.push(evidence)
                        }
                    } else {
                        let met = 0;
                        evidence.requires.forEach(req => {
                            if(this.solvedPuzzles.includes(req)){
                                met++;
                            }
                        })
                        if(met === evidence.requires.length){
                            if(!this.foundEvidence.includes(evidence)){
                                this.foundEvidence.push(evidence);
                                evident.push(evidence);
                            }
                        }
                    }
                })
            }
                if((evident.length + puzz.length) === 0){
                    message.reply("There is nothing to observe in this room that you have not already seen. Use the list command to see all your evidence and puzzles.");
                } else {
                evident.forEach(evidence => {
                    evidenceEmbed.addField(`${evidence.name}`, evidence.content);
                })

                puzz.forEach(puzzle => {
                    evidenceEmbed.addField(`* ${puzzle.name}`, puzzle.content);
                })
                await message.reply({embeds: [evidenceEmbed]});
        }
                resolve();
            } catch (e){
                reject(e);
            }
        })
    }
    list (message){
        return new Promise(async (resolve, reject) => {
            try {
                if(this.foundEvidence.length > 0 || this.foundPuzzles.length > 0){
                const evidenceEmbed = new MessageEmbed()
                    .setTitle(`All Found Evidence and Puzzles`)
                    .setDescription(`Puzzles are marked with * or a checkmark if they are solved`);
                this.foundEvidence.forEach(evidence => {
                    evidenceEmbed.addField(evidence.name, evidence.content);
                })
                this.foundPuzzles.forEach(puzzle => {
                    evidenceEmbed.addField(`${this.solvedPuzzles.includes(puzzle.id) ? ":white_check_mark:" : "*"} ${puzzle.name}`, puzzle.content);
                })
                await message.reply({embeds: [evidenceEmbed]});
            } else {
                message.reply("You haven't found any evidence or puzzles yet.");
            }
                resolve()
            } catch (e){
                reject(e);
            }
        })
    }
    solve(message){
        let channel = message.member.voice.channel;
        if(!channel){
            return message.reply("You need to be in a voice channel to do that.");
        }
        let room = channel.name;
        if(!this.evidence.rooms[room]){
            return message.reply("That room doesn't exist.");
        }
        let puzzlesRaw = this.evidence.rooms[room].puzzles;
        let puzzles = []
        if(!puzzlesRaw) return message.reply("There are no puzzles in this room.");
        puzzlesRaw.forEach(puzzle => {
            if(!this.solvedPuzzles.includes(puzzle.id) && this.foundPuzzles.includes(puzzle)){
                puzzles.push({
                    value: puzzle.id,
                    label: puzzle.name,
                    description: puzzle.shortdesc
                })
            }
        })
        if(puzzles.length > 0){
            const row = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId('puzzle')
                        .setPlaceholder('Select a puzzle to solve')
                        .addOptions(puzzles),
                );
            message.reply({content: "Choose a puzzle to solve:", components: [row]}).then(async msg => {
                const filter = i => {
                    i.deferUpdate();
                    return i.user.id === message.author.id;
                };
                
            msg.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 60000 })
                .then(interaction => {
                    let puzzle = puzzlesRaw.find(puzzle => puzzle.id === interaction.values[0]);
                    let solution = puzzle.solution.split('.');
                    let solutionType = solution[0];
                    let solutionValue = solution[1];
                    let filter;
                    let collector;
                    switch(solutionType){
                        case 'code':
                            message.reply(`Please input your ${solutionValue.length} digit, numerical code:`);
                            // Create a message collector to listen to the correct solution
                            filter = m => (m.author.id === message.author.id) && (m.content.length === solutionValue.length) && (m.content.match(/^[0-9]+$/));
                            collector = this.channel.createMessageCollector({ filter, max: 1, time: 30000 });
                            collector.on('collect', async (m) => {
                                if(m.content === solutionValue){
                                    this.solvedPuzzles.push(puzzle.id);
                                    await this.channel.send(`${message.author} solved the puzzle ${puzzle.name}!`);
                                    if(this.solvedPuzzles.length === this.allPuzzles.length){
                                        await this.channel.send(`<@&${this.role}>\n${this.game.escapeMsg}`);
                                    }
                                } else {
                                    m.reply("That is not the correct solution.");
                                }
                            })
                            break;
                        case 'string':
                            message.reply(`Please enter your ${solutionValue.length} character code (Letters, numbers, and symbols):`);
                            // Create a message collector to listen to the correct solution
                            filter = m => (m.author.id === message.author.id) && (m.content.length === solutionValue.length);
                            collector = this.channel.createMessageCollector({ filter, max: 1, time: 60000 });
                            collector.on('collect', async (m) => {
                                if(m.content === solutionValue){
                                    this.solvedPuzzles.push(puzzle.id);
                                    await this.channel.send(`${message.author} solved the puzzle ${puzzle.name}!`);
                                    if(this.solvedPuzzles.length === this.allPuzzles.length){
                                        await this.channel.send(`<@&${this.role}>\n${this.game.escapeMsg}`);
                                        // Create a variable that holds the amount of minutes since this.startTime
                                        let time = Math.floor((Date.now() - this.startTime) / 1000 / 60);
                                        await this.channel.send(`You beat ${this.game.name} in ${time} minutes!`);
                                        this.collector.stop();
                                        this.client.escapeRooms.delete(this.guild.id)
                                    }
                                } else {
                                    m.reply("That is not the correct solution.");
                                }
                            })
                            break;
                        default:
                            message.reply(`This puzzle has not been set up properly.`);
                            break;
                    }
                })
                .catch(e => message.reply("You didn't select a puzzle in time."));
            })
        } else {
            message.reply("You haven't found any in puzzles in this room yet, or all your discovered puzzles here have been solved. Use the observe command.");
        }
    }
    handleCommands(){
        const filter = m => ["solve", "observe", "list"].includes(m.content.toLowerCase()) && this.players.includes(m.member);
        let options = this.time === null ? {filter, idle: 2 * 60 * 60 * 1000 } : {filter, time: this.time * 60 * 1000 };
        this.collector = this.interaction.channel.createMessageCollector(options);

        this.collector.on('collect', m => {
            switch(m.content.toLowerCase()){
                case 'observe':
                    this.observe(m);
                    break;
                case 'solve':
                    this.solve(m);
                    break;
                case 'list':
                    this.list(m);
                    break;
            }
        });
        
        this.collector.on('end', () => {
            this.interaction.channel.send(`Your time is up!!!`);
            this.client.escapeRooms.delete("957275107699593276");
        });
    }
    start(){
        for (let room in this.evidence.rooms){
            if(this.evidence.rooms[room].puzzles == null) continue;
            this.evidence.rooms[room].puzzles.forEach(puzzle => {
                if(!this.allPuzzles.includes(puzzle)){
                    this.allPuzzles.push(puzzle.id);
                }
            })
        }
        const storyEmbed = new MessageEmbed()
            .setTitle(`${this.game.name}`)
            .setDescription(`**__Story__**\n${this.game.story}\n\n**__How to play__**\nYou will type in this channel to gather evidence and answer puzzles. The available evidence and puzzles change depending on what room (vc) you are in.\n\n**__Available Commands:__**`)
            .addField('Observe', 'Observe the current room to locate puzzles and possible evidence.')
            .addField('List', 'List all the available evidence and puzzles (and their status).')
            .addField('Solve', 'Solve a puzzle.')
            .setAuthor({name: this.client.user.tag, iconURL: this.client.user.displayAvatarURL({dynamic: true})})
        this.interaction.channel.send({embeds: [storyEmbed]})
    }
    // Add a method to start the escape room
    createRoles(){
        return new Promise(async (resolve, reject) => {
            try {
                // Create a role called Escapee
                let role = await this.interaction.guild.roles.create({ hoist: true, name: 'Player', reason: `${this.interaction.user.tag} started a new escape room game.` })
                this.role = role.id;
                for(const player of this.players){
                    player.roles.add(role);
                }
                resolve();
            } catch (e){
                reject(e);
            }
        })
    }
    createChannels(){
        return new Promise(async (resolve, reject) => {
            try {
                await this.interaction.channel.setName(this.game.channel_name)
                let floors = []
                for(const floor of this.evidence.floors){
                    floors.push(await this.guild.channels.create(floor, { reason: `${this.host.tag} started a new escape room game.`, type: "GUILD_CATEGORY" }))
                }
                let first = true;
                
                for(const room in this.evidence.rooms){
                    if(first){
                        let WaitingRoom = this.interaction.guild.channels.cache.find(channel => channel.type === 'GUILD_VOICE' && channel.name == "Waiting Room")
                        await WaitingRoom.setName(room);
                        await WaitingRoom.setParent(floors[this.evidence.rooms[room].parent]);
                        first = false;
                    } else {
                        floors[this.evidence.rooms[room].parent].createChannel(room, { reason: `${this.host.tag} started a new escape room game.`, type: "GUILD_VOICE" })
                    }
                }
                resolve()
            } catch (e){
                console.error(e)
                reject(e);
            }
        })
    }
}
module.exports = EscapeRoom;