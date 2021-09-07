import { bot } from '../index';
import menuJsonToMap from '../menu_json_to_map';

// The '/menu' command
bot.command('menu', async (ctx) => {
  let date: Date = new Date();
  let menu: Map<string, string[]> = menuJsonToMap();
  let todaysMenu: string[] | undefined = menu.get(
    `${date.getDate()}.${date.getMonth()}.${date.getFullYear()}`
  );

  if (todaysMenu) ctx.reply(`Günün Menüsü:\n-${todaysMenu.join('\n-')}`);
  else if (!todaysMenu && menu) ctx.reply('Günün menüsü bulunamadı.');
  else if (!menu) ctx.reply('Ayın menüsü bulunamadı.');
});
