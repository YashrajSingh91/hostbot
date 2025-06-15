const Discord = require('discord.js');
const axios = require('axios');
const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.MessageContent] });

const prefix = '!';
const CHECK_HOST_API = 'https://check-host.net';

// Replace with your Discord bot token
const TOKEN = '';

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const host = args[0];

    if (!host) {
        return message.reply('Please provide a host to check (e.g., google.com or smtp://gmail.com:587).');
    }

    const checkTypes = ['http', 'ping', 'tcp', 'udp', 'dns'];
    if (!checkTypes.includes(command.replace('check', ''))) {
        return message.reply(`Invalid command. Use one of: ${checkTypes.map(type => `!check${type}`).join(', ')}`);
    }

    const checkType = command.replace('check', '');
    try {
        // Send initial request to Check-Host API
        const response = await axios.get(`${CHECK_HOST_API}/check-${checkType}?host=${encodeURIComponent(host)}&max_nodes=3`, {
            headers: { 'Accept': 'application/json' }
        });

        const { request_id, permanent_link } = response.data;
        if (!request_id) {
            return message.reply('Failed to initiate check. Please try again.');
        }

        // Poll for results
        let results = null;
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
            const resultResponse = await axios.get(`${CHECK_HOST_API}/check-result/${request_id}`, {
                headers: { 'Accept': 'application/json' }
            });
            results = resultResponse.data;

            // Check if all nodes have responded
            const nodes = Object.keys(results);
            const completed = nodes.every(node => results[node] !== null);
            if (completed) break;
        }

        if (!results) {
            return message.reply('No results received from Check-Host API.');
        }

        // Format results based on check type
        let reply = `**${checkType.toUpperCase()} Check Results for ${host}**\n`;
        reply += `Permanent Link: ${permanent_link}\n\n`;

        for (const [node, result] of Object.entries(results)) {
            if (!result) {
                reply += `${node}: Still processing...\n`;
                continue;
            }

            if (checkType === 'ping') {
                if (result[0] && Array.isArray(result[0])) {
                    reply += `${node}:\n`;
                    result[0].forEach(ping => {
                        if (ping && Array.isArray(ping)) {
                            const [status, time, ip] = ping;
                            reply += `  - ${status} (${time}s, ${ip || 'N/A'})\n`;
                        } else {
                            reply += `  - No data\n`;
                        }
                    });
                } else {
                    reply += `${node}: No data\n`;
                }
            } else if (checkType === 'http') {
                if (result[0] && result[0].status) {
                    reply += `${node}: Status ${result[0].status} (${result[0].time}s)\n`;
                } else if (result[0] && result[0].error) {
                    reply += `${node}: Error - ${result[0].error}\n`;
                } else {
                    reply += `${node}: No data\n`;
                }
            } else if (checkType === 'tcp' || checkType === 'udp') {
                if (result[0] && result[0].address) {
                    reply += `${node}: Connected (${result[0].time}s, ${result[0].address})\n`;
                } else if (result[0] && result[0].error) {
                    reply += `${node}: ${result[0].error}\n`;
                } else {
                    reply += `${node}: No data\n`;
                }
            } else if (checkType === 'dns') {
                if (result[0] && result[0].A) {
                    reply += `${node}: A Records - ${result[0].A.join(', ')}\n`;
                } else if (result[0] && result[0].error) {
                    reply += `${node}: Error - ${result[0].error}\n`;
                } else {
                    reply += `${node}: No data\n`;
                }
            }
        }

        // Split message if too long
        const maxLength = 2000;
        if (reply.length > maxLength) {
            const parts = reply.match(new RegExp(`.{1,${maxLength}}`, 'g'));
            for (const part of parts) {
                await message.reply(part);
            }
        } else {
            await message.reply(reply);
        }
    } catch (error) {
        console.error(error);
        await message.reply(`An error occurred: ${error.message}`);
    }
});

client.login(TOKEN);
