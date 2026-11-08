const fs = require('fs');
let s = fs.readFileSync('index.html', 'utf8');
s = s.replace(/clamp\(\s*[\d.]+px,\s*[\d.]+vw,\s*([\d.]+px)\s*\)/g, '$1');
fs.writeFileSync('index.html', s);
console.log('done');