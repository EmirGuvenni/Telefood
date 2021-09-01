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
