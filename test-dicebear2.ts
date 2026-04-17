import fs from 'fs';
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&facialHair=moustacheMagnum").then(r=>r.text()).then(t=>fs.writeFileSync('test1.txt', t));
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&top=noHair").then(r=>r.text()).then(t=>fs.writeFileSync('test2.txt', t));
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&hairColor=black").then(r=>r.text()).then(t=>fs.writeFileSync('test3.txt', t));
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&skinColor=f8d25c").then(r=>r.text()).then(t=>fs.writeFileSync('test4.txt', t));
