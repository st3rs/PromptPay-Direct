const fetch = require('node-fetch');
fetch('https://api.bitkub.com/api/market/ticker?sym=thb_usdt')
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
