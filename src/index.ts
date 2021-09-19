if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN is not set.');
  process.exit(1);
}
if (!process.env.CHAT_ID) {
  console.error('CHAT_ID is not set.');
  process.exit(1);
}

// Import dependencies
import { Telegraf } from 'telegraf';
import schedule, { Job } from 'node-schedule';
import pino from 'pino';

import menuJsonToMap from './menu_json_to_map';
import xlsxToJson from './excel_to_json';

export const logger = pino();

// Start the bot
export const bot = new Telegraf(process.env.BOT_TOKEN!);
bot
  .launch()
  .then(() => logger.info('Bot started'))
  .catch((err) => {
    logger.error('Failed to start the bot: ' + err);
    process.exit(1);
  });

bot.command('menu', require('./commands/menu'));

// Send the message at 11:30 every weekday
const job: Job = schedule.scheduleJob('30 11 * * 0-5', () => {
  let date: Date = new Date();
  let menu: Map<string, string[]> = menuJsonToMap();
  let todaysMenu: string[] | undefined = menu.get(
    `${date.getDate()}.${date.getMonth()}.${date.getFullYear()}`
  );

  if (todaysMenu) {
    bot.telegram.sendMessage(
      process.env.CHAT_ID!,
      `Günün Menüsü:\n-${todaysMenu.join('\n-')}`
    );
    // Ask people to wether they'll eat or not
    bot.telegram.sendPoll(
      process.env.CHAT_ID!,
      'Yemeğe gidiyor musun?',
      ['Evet', 'Hayır'],
      {
        is_anonymous: false,
        allows_multiple_answers: false,
        open_period: 600,
      }
    );
    logger.info('Sent the daily menu to the group chat.');
  } else if (!todaysMenu && menu)
    bot.telegram.sendMessage(process.env.CHAT_ID!, 'Günün menüsü bulunamadı.');
  else if (!menu) {
    bot.telegram.sendMessage(process.env.CHAT_ID!, 'Ayın menüsü bulunamadı.');
    logger.warn('Failed to find this months menu.');
  }
});

// Get the xlsx file
// Get the submitted files buffer, convert it, sort it and write to disk
bot.on('message', async (ctx) => xlsxToJson(ctx));

// Graceful stop
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
