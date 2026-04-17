import fs from 'fs';
fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&top=noHair,shortHairShortFlat,shortHairSides,longHairStraight,longHairCurly,longHairBun,hijab,turban").then(r=>r.text()).then(t=>console.log(t.substring(0, 500)));
