const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { amount } = req.body;
  const amountInCents = Math.round(amount * 100);
  const secretKey = process.env.STRIPE_SECRET_KEY;

  const postData = new URLSearchParams({
    amount: amountInCents,
    currency: 'usd',
    'automatic_payment_methods[enabled]': 'true'
  }).toString();

  const options = {
    hostname: 'api.stripe.com',
    path: '/v1/payment_intents',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + secretKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const data = await new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => resolve(JSON.parse(body)));
    });
    request.on('error', reject);
    request.write(postData);
    request.end();
  });

  if (data.error) {
    return res.status(400).json({ error: data.error.message });
  }

  res.status(200).json({ clientSecret: data.client_secret });
};
