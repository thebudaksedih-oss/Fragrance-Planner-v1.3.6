import fs from 'fs';
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&skinColor=edb98a&top=shortHairShortFlat&hairColor=brownDark&eyes=default&mouth=smile&facialHair=blank").then(r=>r.text()).then(t=>fs.writeFileSync('test1.txt', t));
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&skinColor=edb98a&top=shortHairShortFlat&hairColor=brownDark&eyes=default&mouth=smile&facialHair=blank&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc").then(r=>r.text()).then(t=>fs.writeFileSync('test2.txt', t));
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar").then(r=>r.text()).then(t=>fs.writeFileSync('test3.txt', t));
