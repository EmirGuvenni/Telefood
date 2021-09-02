if (!process.env.BOT_TOKEN) {
	console.error('BOT_TOKEN is not set.');
	process.exit(1);
}
if (!process.env.WEBHOOK_URL) {
	console.error('WEBHOOK_URL is not set.');
	process.exit(1);
}
if (!process.env.CHAT_ID) {
	console.error('CHAT_ID is not set.');
	process.exit(1);
}

import { Telegraf } from "telegraf";

// Start the bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Start a webhook to listen for a incoming menu
bot.telegram.setWebhook(process.env.WEBHOOK_URL);

// Graceful stop
process.once("SIGINT", () => {
  bot.stop();
});
process.once("SIGTERM", () => {
  bot.stop();
});
