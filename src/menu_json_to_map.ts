import fs from 'fs';

export default function menuJsonToMap(): Map<string, any> {
  let date: Date = new Date();
  let file: string = '';
  let month: string = `${date.getFullYear()}.${date.getMonth()}`;

  fs.readdirSync(__dirname + '/../uploads').some((fileName: string) => {
    file = __dirname + '/../uploads/' + fileName;
    return fileName.startsWith(month);
  });

  if (!fs.existsSync(file)) throw new Error('Ayın menüsü bulunamadı.');

  let menuMap: Map<string, any> = new Map(
    Object.entries(JSON.parse(fs.readFileSync(file).toString()))
  );
  menuMap.set('date', `${date.getFullYear()}.${date.getMonth()}`);

  return menuMap;
}
