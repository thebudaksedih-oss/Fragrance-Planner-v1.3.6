import fs from 'fs';
['noHair', 'shortHairShortFlat', 'shortHairShortWaved', 'shortHairSides', 'longHairStraight', 'longHairCurly', 'longHairBun', 'hijab', 'turban'].forEach(t => {
  fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&top=" + t).then(r=>r.text()).then(res=>{
     if(res.includes('Bad Request')) console.log(t, 'FAIL'); else console.log(t, 'OK');
  });
});
