import fs from 'fs';
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&eyes=default").then(r=>r.text()).then(t=>fs.writeFileSync('test1.txt', t));
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&mouth=smile").then(r=>r.text()).then(t=>fs.writeFileSync('test2.txt', t));
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&facialHairProbability=0").then(r=>r.text()).then(t=>fs.writeFileSync('test3.txt', t));
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&facialHair=").then(r=>r.text()).then(t=>fs.writeFileSync('test4.txt', t));
