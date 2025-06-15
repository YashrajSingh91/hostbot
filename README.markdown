# Discord Check-Host Bot

A Discord bot that uses the Check-Host API to perform HTTP, ping, TCP, UDP, and DNS checks on specified hosts.

## Setup Instructions

1. **Create a Discord Bot**:
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications).
   - Create a new application and add a bot.
   - Enable the following intents under the "Bot" tab:
     - Server Members Intent
     - Message Content Intent
   - Copy the bot token.

2. **Install Node.js**:
   - Download and install Node.js from [nodejs.org](https://nodejs.org/) (LTS version recommended).

3. **Set Up the Project**:
   - Create a new directory for your bot.
   - Save the `bot.js` and `package.json` files in this directory.
   - Open a terminal in the directory and run:
     ```bash
     npm install
     ```

4. **Configure the Bot**:
   - Replace `'YOUR_DISCORD_BOT_TOKEN'` in `bot.js` with your actual bot token.

5. **Run the Bot**:
   - In the terminal, run:
     ```bash
     node bot.js
     ```
   - The bot should log in and display "Logged in as [Bot Name]!".

6. **Invite the Bot to Your Server**:
   - In the Discord Developer Portal, go to the "OAuth2" tab.
   - Select "bot" under "Scopes" and choose permissions (e.g., Send Messages, Read Message History).
   - Copy the generated URL, open it in a browser, and invite the bot to your server.

## Commands
- `!checkhttp <host>`: Performs an HTTP check (e.g., `!checkhttp google.com`).
- `!checkping <host>`: Performs a ping check (e.g., `!checkping google.com`).
- `!checktcp <host>`: Performs a TCP check (e.g., `!checktcp smtp://gmail.com:587`).
- `!checkudp <host>`: Performs a UDP check (e.g., `!checkudp google.com:53`).
- `!checkdns <host>`: Performs a DNS check (e.g., `!checkdns google.com`).

## Notes
- The bot uses the Check-Host API, which may have rate limits. Be mindful of usage.
- Results are polled for up to 10 seconds to ensure all nodes respond.
- Error handling is included to manage API or network issues.
- The bot splits long messages to comply with Discord's 2000-character limit.

## Dependencies
- `discord.js`: For interacting with the Discord API.
- `axios`: For making HTTP requests to the Check-Host API.

## Troubleshooting
- If the bot doesn't respond, ensure the token is correct and intents are enabled.
- Check the console for error messages.
- Ensure the host format is correct (e.g., `smtp://gmail.com:587` for TCP, `google.com` for HTTP/ping/DNS).