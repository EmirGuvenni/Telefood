import excelToJson from 'convert-excel-to-json';
import { Document } from 'typegram';
import crypto from 'crypto';
import fetch from 'node-fetch';
import fs from 'fs';

import { bot, logger } from './index';
import { Context } from 'telegraf';

export default async function xlsxToJson(ctx: Context): Promise<void> {
  // @ts-ignore
  let file: Document = ctx.message.document;

  if (!file || !file.file_name?.endsWith('.xlsx')) return;

  let rawMenuJson = await fetchAndConvertToRawJson(file);
  filterEmptyPages(rawMenuJson);
  let sortedMenuJson = sortTheMenu(rawMenuJson);
  saveTheMenuJson(sortedMenuJson, ctx);
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

async function fetchAndConvertToRawJson(file: Document) {
  // Fetch the file buffer and convert it to JSON
  return excelToJson({
    source: Buffer.from(
      await (
        await fetch((await bot.telegram.getFileLink(file.file_id)).href)
      ).arrayBuffer()
    ),
    header: {
      rows: 1,
    },
  });
}

function filterEmptyPages(rawMenuJson: any) {
  // Filter empty pages
  for (let [key, value] of Object.entries(rawMenuJson)) {
    if (Array.isArray(value) && !value.length) {
      delete rawMenuJson[key];
    }
  }
}

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
function sortTheMenu(sortedMenuJson: object) {
  const menuJson = (() => {
    let menu: any = {};
    const days: string[] = [
      'PAZARTESİ',
      'SALI',
      'ÇARŞAMBA',
      'PERŞEMBE',
      'CUMA',
    ];

    Object.values(sortedMenuJson).forEach((page: any[]) => {
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
            let date: Date = new Date(rawDate.setDate(rawDate.getDate() + 1));

            pointer = getDate(date);
            menu[pointer] = [];
          } else menu[pointer].push(cols[i]);
        });
      }
    });

    return menu;
  })();

  return menuJson;
}

function saveTheMenuJson(menuJson: any, ctx: Context) {
  let path: string = `${__dirname}/../uploads/${getYear()}.${getMonth()}_${crypto
    .createHash('md5')
    .update(JSON.stringify(menuJson))
    .digest('hex')}.json`;

  if (fs.existsSync(path)) return ctx.reply('Bu menü zaten kaydedilmiş.');

  // Save the menu to the /uploads directory as a JSON file
  fs.writeFileSync(path, JSON.stringify(menuJson));
  ctx.reply('Menü başarıyla kaydedildi.');
  logger.info('Menu file uploaded');
}
