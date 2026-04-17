import fs from 'fs';

const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'slate', 'gray', 'zinc', 'neutral', 'stone'];

const themes = [];

// Keep original themes first
themes.push(
  { id: 'default', name: 'Default', top: 'bg-white', bottom: 'bg-white', text: 'text-gray-900', subText: 'text-gray-500', accent: 'bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400', border: 'border-gray-200', tagBg: 'bg-gray-50', tagText: 'text-gray-600' },
  { id: 'black-gold', name: 'Black Gold', top: 'bg-gray-900', bottom: 'bg-gray-800', text: 'text-yellow-500', subText: 'text-gray-400', accent: 'bg-gradient-to-r from-yellow-400 to-yellow-600', border: 'border-gray-700', tagBg: 'bg-gray-700', tagText: 'text-yellow-400' },
  { id: 'silver-gold', name: 'Silver Gold', top: 'bg-gray-200', bottom: 'bg-gray-100', text: 'text-yellow-700', subText: 'text-gray-500', accent: 'bg-gradient-to-r from-gray-400 to-yellow-500', border: 'border-gray-300', tagBg: 'bg-gray-300', tagText: 'text-gray-700' },
  { id: 'white-gold', name: 'White Gold', top: 'bg-white', bottom: 'bg-yellow-50', text: 'text-yellow-600', subText: 'text-gray-400', accent: 'bg-gradient-to-r from-yellow-200 to-yellow-500', border: 'border-yellow-100', tagBg: 'bg-yellow-100', tagText: 'text-yellow-700' },
  { id: 'black-rose-gold', name: 'Black Rose Gold', top: 'bg-gray-900', bottom: 'bg-gray-800', text: 'text-rose-400', subText: 'text-gray-400', accent: 'bg-gradient-to-r from-rose-300 to-rose-500', border: 'border-gray-700', tagBg: 'bg-gray-700', tagText: 'text-rose-300' },
  { id: 'white-rose-gold', name: 'White Rose Gold', top: 'bg-white', bottom: 'bg-rose-50', text: 'text-rose-500', subText: 'text-gray-400', accent: 'bg-gradient-to-r from-rose-200 to-rose-400', border: 'border-rose-100', tagBg: 'bg-rose-100', tagText: 'text-rose-600' },
  { id: 'obsidian', name: 'Obsidian', top: 'bg-black', bottom: 'bg-zinc-900', text: 'text-zinc-300', subText: 'text-zinc-500', accent: 'bg-gradient-to-r from-zinc-500 to-zinc-700', border: 'border-zinc-800', tagBg: 'bg-zinc-800', tagText: 'text-zinc-400' },
  { id: 'pearl', name: 'Pearl', top: 'bg-slate-50', bottom: 'bg-white', text: 'text-slate-800', subText: 'text-slate-500', accent: 'bg-gradient-to-r from-slate-200 to-slate-400', border: 'border-slate-200', tagBg: 'bg-slate-100', tagText: 'text-slate-600' },
  { id: 'neon-nights', name: 'Neon Nights', top: 'bg-indigo-950', bottom: 'bg-indigo-900', text: 'text-fuchsia-400', subText: 'text-cyan-400', accent: 'bg-gradient-to-r from-fuchsia-500 to-cyan-500', border: 'border-indigo-800', tagBg: 'bg-indigo-800', tagText: 'text-fuchsia-300' }
);

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

colors.forEach(c => {
  const name = capitalize(c);
  // 1. Light
  themes.push({ id: `${c}-light`, name: `${name} Light`, top: `bg-${c}-50`, bottom: `bg-${c}-100`, text: `text-${c}-900`, subText: `text-${c}-600`, accent: `bg-gradient-to-r from-${c}-300 to-${c}-500`, border: `border-${c}-200`, tagBg: `bg-${c}-200`, tagText: `text-${c}-800` });
  // 2. Soft
  themes.push({ id: `${c}-soft`, name: `${name} Soft`, top: `bg-${c}-100`, bottom: `bg-${c}-200`, text: `text-${c}-900`, subText: `text-${c}-700`, accent: `bg-gradient-to-r from-${c}-400 to-${c}-600`, border: `border-${c}-300`, tagBg: `bg-${c}-300`, tagText: `text-${c}-900` });
  // 3. Medium
  themes.push({ id: `${c}-medium`, name: `${name} Medium`, top: `bg-${c}-500`, bottom: `bg-${c}-600`, text: `text-white`, subText: `text-${c}-100`, accent: `bg-gradient-to-r from-${c}-300 to-${c}-400`, border: `border-${c}-700`, tagBg: `bg-${c}-700`, tagText: `text-${c}-100` });
  // 4. Dark
  themes.push({ id: `${c}-dark`, name: `${name} Dark`, top: `bg-${c}-800`, bottom: `bg-${c}-900`, text: `text-${c}-50`, subText: `text-${c}-300`, accent: `bg-gradient-to-r from-${c}-400 to-${c}-600`, border: `border-${c}-700`, tagBg: `bg-${c}-700`, tagText: `text-${c}-200` });
  // 5. Deep
  themes.push({ id: `${c}-deep`, name: `${name} Deep`, top: `bg-${c}-900`, bottom: `bg-${c}-950`, text: `text-${c}-100`, subText: `text-${c}-400`, accent: `bg-gradient-to-r from-${c}-500 to-${c}-700`, border: `border-${c}-800`, tagBg: `bg-${c}-800`, tagText: `text-${c}-300` });
  // 6. Black + Color
  themes.push({ id: `black-${c}`, name: `Black & ${name}`, top: `bg-black`, bottom: `bg-${c}-950`, text: `text-${c}-400`, subText: `text-${c}-600`, accent: `bg-gradient-to-r from-${c}-600 to-${c}-800`, border: `border-${c}-900`, tagBg: `bg-${c}-900`, tagText: `text-${c}-500` });
  // 7. White + Color
  themes.push({ id: `white-${c}`, name: `White & ${name}`, top: `bg-white`, bottom: `bg-${c}-50`, text: `text-${c}-600`, subText: `text-${c}-400`, accent: `bg-gradient-to-r from-${c}-200 to-${c}-400`, border: `border-${c}-100`, tagBg: `bg-${c}-100`, tagText: `text-${c}-700` });
  // 8. Color + Gold
  themes.push({ id: `${c}-gold`, name: `${name} & Gold`, top: `bg-${c}-900`, bottom: `bg-${c}-800`, text: `text-yellow-500`, subText: `text-${c}-300`, accent: `bg-gradient-to-r from-yellow-400 to-yellow-600`, border: `border-${c}-700`, tagBg: `bg-${c}-700`, tagText: `text-yellow-400` });
});

const content = `export const colorThemes = [\n  ${themes.map(t => JSON.stringify(t).replace(/"([^"]+)":/g, '$1:')).join(',\n  ')}\n];`;

const filePath = './src/components/FragranceDatabase.tsx';
let fileContent = fs.readFileSync(filePath, 'utf-8');

const startIdx = fileContent.indexOf('export const colorThemes = [');
const endIdx = fileContent.indexOf('];', startIdx) + 2;

fileContent = fileContent.substring(0, startIdx) + content + fileContent.substring(endIdx);

fs.writeFileSync(filePath, fileContent);
console.log('Themes generated and injected successfully.');
