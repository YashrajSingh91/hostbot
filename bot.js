const Discord = require('discord.js');
const axios = require('axios');
const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.MessageContent] });

const prefix = '.'; // Prefix set to .
const CHECK_HOST_API = 'https://check-host.net';
const VIEWDNS_API = 'https://api.viewdns.info';
const PROXY_CHECK_API = 'http://proxycheck.io/v2'; // Explicitly defined
const TOKEN = 'MTM4MjQ0MDU2MDMyOTIyODM1MA.GzXSMj.OWKxSnOA4fOhYO3kJ3DJcvfMeJHtEipILFLRT4'; // Replace with your bot token
const VIEWDNS_API_KEY = '4514861ad013f890b1d92c313fc2326494823df6'; // Replace with your ViewDNS API key
const VERSION = 'm85.69'; // Version number

// In-memory cache for API results
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}! Version: ${VERSION}`);
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // .help command
    if (command === 'help') {
        const commands = [
            { name: 'checkhttp', desc: 'Checks HTTP status of a host', example: '.checkhttp google.com' },
            { name: 'checkping', desc: 'Pings a host to check latency', example: '.checkping google.com' },
            { name: 'checktcp', desc: 'Tests TCP connection to a host', example: '.checktcp smtp://gmail.com:587' },
            { name: 'checkudp', desc: 'Tests UDP connection to a host', example: '.checkudp example.com:53' },
            { name: 'checkdns', desc: 'Resolves DNS records for a host', example: '.checkdns google.com' },
            { name: 'iphistory', desc: 'Shows historical IPs for a domain', example: '.iphistory example.com' },
            { name: 'reverseip', desc: 'Lists domains on an IP address', example: '.reverseip 1.2.3.4' },
            { name: 'dnsrecords', desc: 'Retrieves all DNS records for a domain', example: '.dnsrecords example.com' },
            { name: 'portscan', desc: 'Scans common ports on a server', example: '.portscan 1.2.3.4' },
            { name: 'proxycheck', desc: 'Checks proxy status, protocols, and country', example: '.proxycheck 1.2.3.4:8080 or .proxycheck <file_url>' },
            { name: 'sitedown', desc: 'Checks if a site is down or up', example: '.sitedown google.com' },
            { name: 'info', desc: 'Shows bot uptime and server count', example: '.info' },
            { name: 'help', desc: 'Displays this help menu', example: '.help' }
        ];

        let reply = `**🌐 WebTools Bot Help (Version ${VERSION})** 🌐\n`;
        reply += `**Total Commands: ${commands.length}**\n\n`;
        reply += `**🔍 Check-Host Commands**\n`;
        reply += commands
            .filter(cmd => cmd.name.startsWith('check'))
            .map(cmd => `**${prefix}${cmd.name}** - ${cmd.desc}\n  *Example*: \`${cmd.example}\``)
            .join('\n\n');
        reply += `\n\n**🕵️ ViewDNS Commands**\n`;
        reply += commands
            .filter(cmd => ['iphistory', 'reverseip', 'dnsrecords', 'portscan'].includes(cmd.name))
            .map(cmd => `**${prefix}${cmd.name}** - ${cmd.desc}\n  *Example*: \`${cmd.example}\``)
            .join('\n\n');
        reply += `\n\n**🛡️ Proxy Commands**\n`;
        reply += commands
            .filter(cmd => cmd.name === 'proxycheck')
            .map(cmd => `**${prefix}${cmd.name}** - ${cmd.desc}\n  *Example*: \`${cmd.example}\``)
            .join('\n\n');
        reply += `\n\n**🌐 Utility Commands**\n`;
        reply += commands
            .filter(cmd => ['sitedown', 'info', 'help'].includes(cmd.name))
            .map(cmd => `**${prefix}${cmd.name}** - ${cmd.desc}\n  *Example*: \`${cmd.example}\``)
            .join('\n\n');
        reply += `\n\n**Note**: Use responsibly. API responses may take a few seconds for fresh queries.`;

        const maxLength = 2000;
        if (reply.length > maxLength) {
            const parts = reply.match(new RegExp(`.{1,${maxLength}}`, 'g'));
            for (const part of parts) {
                await message.reply(part);
            }
        } else {
            await message.reply(reply);
        }
        return;
    }

    // .info command
    if (command === 'info') {
        const uptime = Math.floor(process.uptime() / 60);
        const serverCount = client.guilds.cache.size;
        return await message.reply(`**Bot Info (Version ${VERSION})** ℹ️\nUptime: ${uptime} minutes\nServers: ${serverCount}`);
    }

    // Handle proxycheck, ViewDNS, and sitedown commands
    const target = args[0];
    if (!target && ['proxycheck', 'iphistory', 'sitedown', 'reverseip', 'dnsrecords', 'portscan'].includes(command)) {
        return message.reply('Please provide a proxy (IP:port), file URL, domain, or IP (e.g., 1.2.3.4:8080, https://example.com/proxies.txt, or example.com).');
    }

    // .proxycheck command
    if (command === 'proxycheck') {
        const cacheKey = `${command}:${target}`;
        if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                return await message.reply(cached.reply);
            }
        }

        try {
            if (!PROXY_CHECK_API) {
                throw new Error('Proxy check API is not configured.');
            }

            let reply = `**Proxy Check Results for ${target} (Version ${VERSION})** 🛡️\n`;
            let proxies = [];

            // Check if target is a file URL
            if (target.match(/^https?:\/\/.*\.txt$/)) {
                const fileResponse = await axios.get(target);
                proxies = fileResponse.data
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}$/))
                    .slice(0, 10); // Limit to 10 proxies
                if (proxies.length === 0) {
                    return message.reply('No valid proxies found in the file (format: IP:port per line).');
                }
                reply += `Checking ${proxies.length} proxies (max 10):\n\n`;
            } else if (target.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}$/)) {
                proxies = [target];
            } else {
                return message.reply('Invalid input. Use IP:port (e.g., 1.2.3.4:8080) or a .txt file URL (e.g., https://example.com/proxies.txt).');
            }

            // Check each proxy
            for (const proxy of proxies) {
                const [ip, port] = proxy.split(':');
                const response = await axios.get(`${PROXY_CHECK_API}/${ip}?port=${port}&vpn=1&asn=1`, {
                    timeout: 5000,
                    headers: { 'Accept': 'application/json' }
                });

                const data = response.data[ip] || {};
                reply += `**Proxy: ${proxy}**\n`;
                reply += `Status: ${data.proxy === 'yes' ? 'Alive ✅' : 'Dead ❌'}\n`;
                if (data.proxy === 'yes') {
                    const protocols = data.type ? [data.type.toUpperCase()] : [];
                    reply += `Protocols: ${protocols.length > 0 ? protocols.join(', ') : 'Unknown'}\n`;
                    reply += `Country: ${data.country || 'Unknown'}\n`;
                    reply += `Response Time: ${data.query_time || 'Unknown'}\n`;
                }
                reply += '\n';
            }

            // Cache and send reply
            cache.set(cacheKey, { reply, timestamp: Date.now() });
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
            await message.reply(`An error occurred: ${error.message || 'Proxy check failed.'}`);
        }
        return;
    }

    // Custom .sitedown command
    if (command === 'sitedown') {
        const cacheKey = `${command}:${target}`;
        if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                return await message.reply(cached.reply);
            }
        }

        try {
            let url = target.startsWith('http') ? target : `https://${target}`;
            let response;
            try {
                response = await axios.get(url, { timeout: 5000 });
            } catch (error) {
                if (url.startsWith('https')) {
                    url = `http://${target}`;
                    response = await axios.get(url, { timeout: 5000 });
                } else {
                    throw error;
                }
            }

            const statusCode = response.status;
            let reply = `**Site Down Check Results for ${target} (Version ${VERSION})** 🌐\n`;
            reply += `Status: ${statusCode >= 200 && statusCode < 300 ? 'Site is UP ✅' : 'Site is DOWN ❌'}\n`;
            reply += `Status Code: ${statusCode}\n`;

            cache.set(cacheKey, { reply, timestamp: Date.now() });
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
            let reply = `**Site Down Check Results for ${target} (Version ${VERSION})** 🌐\n`;
            reply += `Status: Site is DOWN ❌\n`;
            reply += `Error: ${error.code || error.message || 'Unable to connect'}\n`;
            cache.set(cacheKey, { reply, timestamp: Date.now() });
            await message.reply(reply);
        }
        return;
    }

    // ViewDNS API commands
    if (['iphistory', 'reverseip', 'dnsrecords', 'portscan'].includes(command)) {
        const cacheKey = `${command}:${target}`;
        if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                return await message.reply(cached.reply);
            }
        }

        try {
            let response;
            let reply = `**${command.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Results for ${target} (Version ${VERSION})** 🕵️\n`;

            if (command === 'iphistory') {
                response = await axios.get(`${VIEWDNS_API}/iphistory/?domain=${encodeURIComponent(target)}&apikey=${VIEWDNS_API_KEY}&output=json`);
                const records = response.data.response.records || [];
                if (records.length === 0) {
                    reply += 'No IP history found.\n';
                } else {
                    reply += records.map(r => `IP: ${r.ip}, Owner: ${r.owner}, Location: ${r.location}, Last Seen: ${r.lastseen}`).join('\n') + '\n';
                }
            } else if (command === 'reverseip') {
                response = await axios.get(`${VIEWDNS_API}/reverseip/?host=${encodeURIComponent(target)}&apikey=${VIEWDNS_API_KEY}&output=json`);
                const domains = response.data.response.domains || [];
                if (domains.length === 0) {
                    reply += 'No domains found on this IP.\n';
                } else {
                    reply += `Domains: ${domains.map(d => d.name).join(', ')}\n`;
                }
            } else if (command === 'dnsrecords') {
                response = await axios.get(`${VIEWDNS_API}/dnsrecord/?domain=${encodeURIComponent(target)}&apikey=${VIEWDNS_API_KEY}&output=json`);
                const records = response.data.response.records || [];
                if (records.length === 0) {
                    reply += 'No DNS records found.\n';
                } else {
                    reply += records.map(r => `${r.type}: ${r.data}`).join('\n') + '\n';
                }
            } else if (command === 'portscan') {
                response = await axios.get(`${VIEWDNS_API}/portscan/?host=${encodeURIComponent(target)}&apikey=${VIEWDNS_API_KEY}&output=json`);
                const ports = response.data.response.ports || [];
                if (ports.length === 0) {
                    reply += 'No open ports found.\n';
                } else {
                    reply += ports.map(p => `Port ${p.number}: ${p.status} (${p.service})`).join('\n') + '\n';
                }
            }

            cache.set(cacheKey, { reply, timestamp: Date.now() });
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
            await message.reply(`An error occurred: ${error.message || 'ViewDNS API error.'}`);
        }
        return;
    }

    // Handle Check-Host commands
    const host = args[0];
    if (!host) {
        return message.reply('Please provide a host to check (e.g., google.com or smtp://gmail.com:587).');
    }

    const checkTypes = ['http', 'ping', 'tcp', 'udp', 'dns'];
    if (!checkTypes.includes(command.replace('check', ''))) {
        return message.reply(`Invalid command. Use one of: ${checkTypes.map(type => `${prefix}check${type}`).join(', ')}, ${prefix}proxycheck, ${prefix}iphistory, ${prefix}sitedown, ${prefix}reverseip, ${prefix}dnsrecords, ${prefix}portscan, ${prefix}info, ${prefix}help`);
    }

    const checkType = command.replace('check', '');
    const cacheKey = `${checkType}:${host}`;

    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            return await message.reply(cached.reply);
        }
    }

    try {
        const response = await axios.get(`${CHECK_HOST_API}/check-${checkType}?host=${encodeURIComponent(host)}&max_nodes=3`, {
            headers: { 'Accept': 'application/json' }
        });

        const { request_id, permanent_link } = response.data;
        if (!request_id) {
            return message.reply('Failed to initiate check. Please try again.');
        }

        let results = null;
        for (let i = 0; i < 4; i++) {
            const resultResponse = await axios.get(`${CHECK_HOST_API}/check-result/${request_id}`, {
                headers: { 'Accept': 'application/json' }
            });
            results = resultResponse.data;

            const nodes = Object.keys(results);
            const hasResults = nodes.some(node => results[node] !== null);
            if (hasResults) break;
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!results) {
            return message.reply('No results received from Check-Host API.');
        }

        let reply = `**${checkType.toUpperCase()} Check Results for ${host} (Version ${VERSION})** 🔍\n`;
        reply += `Permanent Link: ${permanent_link}\n\n`;

        let hasResults = false;
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
                            hasResults = true;
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
                    hasResults = true;
                } else if (result[0] && result[0].error) {
                    reply += `${node}: Error - ${result[0].error}\n`;
                    hasResults = true;
                } else {
                    reply += `${node}: No data\n`;
                }
            } else if (checkType === 'tcp' || checkType === 'udp') {
                if (result[0] && result[0].address) {
                    reply += `${node}: Connected (${result[0].time}s, ${result[0].address})\n`;
                    hasResults = true;
                } else if (result[0] && result[0].error) {
                    reply += `${node}: ${result[0].error}\n`;
                    hasResults = true;
                } else {
                    reply += `${node}: No data\n`;
                }
            } else if (checkType === 'dns') {
                if (result[0] && result[0].A) {
                    reply += `${node}: A Records - ${result[0].A.join(', ')}\n`;
                    hasResults = true;
                } else if (result[0] && result[0].error) {
                    reply += `${node}: Error - ${result[0].error}\n`;
                    hasResults = true;
                } else {
                    reply += `${node}: No data\n`;
                }
            }
        }

        if (!hasResults) {
            reply += 'Note: Some results may still be processing. Try again in a few seconds for complete results.';
        }

        cache.set(cacheKey, { reply, timestamp: Date.now() });

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
