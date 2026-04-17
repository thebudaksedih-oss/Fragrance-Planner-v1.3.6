['black', 'blonde', 'brown', 'brownDark', 'pastelPink', 'platinum', 'red', 'silverGray'].forEach(c => {
  fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&hairColor=" + c).then(r=>r.text()).then(res=>{
     if(res.includes('Bad Request')) console.log('hairColor', c, 'FAIL'); else console.log('hairColor', c, 'OK');
  });
});
['smile', 'sad', 'serious', 'twinkle'].forEach(c => {
  fetch("https://api.dicebear.com/9.x/avataaars/svg?seed=Avatar&mouth=" + c).then(r=>r.text()).then(res=>{
     if(res.includes('Bad Request')) console.log('mouth', c, 'FAIL'); else console.log('mouth', c, 'OK');
  });
});
