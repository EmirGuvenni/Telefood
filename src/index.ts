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
import { Document } from 'typegram';
import excelToJson from 'convert-excel-to-json';
import fs from 'fs';
import crypto from 'crypto';
import fetch from 'node-fetch';

const logger = pino();

function menuJsonToMap(): Map<string, any> {
  let file: string = '';
  let month: string = `${getYear()}.${getMonth()}`;

  fs.readdirSync(__dirname + '/../uploads').some((fileName: string) => {
    file = __dirname + '/../uploads/' + fileName;
    return fileName.startsWith(month);
  });

  let menuMap: Map<string, any> = new Map(
    Object.entries(JSON.parse(fs.readFileSync(file).toString()))
  );
  menuMap.set('date', `${getYear()}.${getMonth()}`);

  return menuMap;
}

function getYear(date: Date = new Date()): number {
  return date.getFullYear();
}

function getMonth(date: Date = new Date()): number {
  return date.getMonth();
}

function getToday(date: Date = new Date()): number {
  return date.getDate();
}

function getDate(date?: Date): string {
  return `${getToday(date)}.${getMonth(date)}.${getYear(date)}`;
}

// Start the bot
const bot = new Telegraf(process.env.BOT_TOKEN!);
bot
  .launch()
  .then(() => {
    logger.info('Bot started');
  })
  .catch((err) => {
    logger.error('Failed to start the bot: ' + err);
    process.exit(1);
  });

// Send the message at 11:30 every weekday
const job: Job = schedule.scheduleJob('30 11 * * 0-5', () => {
  let menu = menuJsonToMap();
  let todaysMenu: string[] = menu.get(getDate());

  if (todaysMenu)
    bot.telegram.sendMessage(
      process.env.CHAT_ID!,
      `Günün Menüsü:\n-${todaysMenu.join('\n-')}`
    );
  else
    bot.telegram.sendMessage(process.env.CHAT_ID!, 'Günün menüsü bulunamadı.');
});

// Get the xlsx file
bot.on('message', async (ctx) => {
  // Get the submitted files buffer and write to disk
  // @ts-ignore
  const file: Document = ctx.message.document;

  if (!file || !file.file_name?.endsWith('.xlsx')) return;

  // Fetch the file buffer and convert it to JSON
  const rawMenuJson = excelToJson({
    source: Buffer.from(
      await (
        await fetch((await bot.telegram.getFileLink(file.file_id)).href)
      ).arrayBuffer()
    ),
    header: {
      rows: 1,
    },
  });

  // Filter empyt pages
  for (let [key, value] of Object.entries(rawMenuJson)) {
    if (Array.isArray(value) && !value.length) {
      delete rawMenuJson[key];
    }
  }

  // Group days and meals
  //
  // For this to work, the excel file must be in the following format:
  //
  // {
  //   "Sayfa1": [
  //     {
  //       "A": "KARTAL İZ-PARK EYLÜL AYI ÖĞLEN YEMEK MÖNÜSÜ"
  //     },
  //     {
  //       "C": "2021-08-31T20:59:04.000Z",
  //       ...
  //     },
  //     {
  //       "C": "ÇARŞAMBA",
  //       ...
  //     },
  //     ...
  //   ]
  // }
  //
  // Expected output:
  //
  // NOTE: It should remove the day of the week
  //
  // {
  //   "2021-07-31": [
  //     "DOMATESLİ ARPA ŞEHRİYE ÇORBA",
  //     "KÖRİ SOSLU TAVUK",
  //     "ORMAN KEBABI",
  //     ...
  //   ]
  // }
  const menuJson = (() => {
    let menu: any = {};
    const days: string[] = [
      'PAZARTESİ',
      'SALI',
      'ÇARŞAMBA',
      'PERŞEMBE',
      'CUMA',
    ];

    Object.values(rawMenuJson).forEach((page) => {
      page.forEach((row: any, index: number) => {
        // Remove rows which includes days
        let value: string = Object.values(row)[0] as string;
        if (typeof value === 'string' && days.includes(value))
          page.splice(index, 1);
      });

      let pointer: string = '';

      for (let i = 0; i < 5; i++) {
        page.forEach((row: any) => {
          let cols: string[] = Object.values(row);

          if (!cols[i]) return;

          if (new Date(cols[i]).getTime() > 0) {
            let rawDate: Date = new Date(cols[i]);
            let setDayDate: Date = new Date(
              rawDate.setDate(rawDate.getDate() + 1)
            );
            let setMonthDate: Date = new Date(
              setDayDate.setMonth(setDayDate.getMonth() - 1)
            );

            pointer = setMonthDate.toLocaleString();

            menu[pointer] = [];
          } else menu[pointer].push(cols[i]);
        });
      }
    });

    return menu;
  })();

  let path: string = `${__dirname}/../uploads/${crypto
    .createHash('md5')
    .update(JSON.stringify(menuJson))
    .digest('hex')}.json`;

  if (fs.existsSync(path)) return ctx.reply('Bu menü zaten kaydedilmiş.');

  // Save the menu to the /uploads directory as a JSON file
  fs.writeFileSync(path, JSON.stringify(menuJson));
  logger.info('Menu file uploaded');
});

// Graceful stop
process.once('SIGINT', () => {
  bot.stop();
});
process.once('SIGTERM', () => {
  bot.stop();
});
