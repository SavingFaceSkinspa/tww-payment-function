const https = require('https');
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/create-payment-intent') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { amount } = JSON.parse(body);
        const amountInCents = Math.round(amount * 100);
        const secretKey = process.env.STRIPE_SECRET_KEY;

        if (!secretKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Stripe key not configured' }));
          return;
        }

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
            let responseBody = '';
            response.on('data', chunk => responseBody += chunk);
            response.on('end', () => resolve(JSON.parse(responseBody)));
          });
          request.on('error', reject);
          request.write(postData);
          request.end();
        });

        if (data.error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: data.error.message }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ clientSecret: data.client_secret }));

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('TWW Payment Service is running!');
  }
});

server.listen(PORT, () => {
  console.log('Payment server running on port ' + PORT);
});
