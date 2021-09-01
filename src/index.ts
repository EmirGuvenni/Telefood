import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);

// Graceful stop
process.once("SIGINT", () => {
  bot.stop();
});
process.once("SIGTERM", () => {
  bot.stop();
});
