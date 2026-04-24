const express = require('express');
const fetch = require('node-fetch');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  next();
});

app.options('/proxy', (req, res) => res.sendStatus(204));

app.get('/', (req, res) => {
  res.type('text').send('Local CORS proxy running');
});

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url query param');

  try {
    // Basic validation
    new URL(url);
  } catch (e) {
    return res.status(400).send('Invalid URL');
  }

  try {
    const upstream = await fetch(url, { headers: { 'user-agent': req.get('user-agent') || 'node-proxy' } });
    res.status(upstream.status);

    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);

    // Set CORS again on proxied response
    res.setHeader('Access-Control-Allow-Origin', '*');

    const body = upstream.body;
    if (!body) return res.sendStatus(204);
    body.pipe(res);
  } catch (err) {
    res.status(502).send('Upstream request failed: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`Proxy listening on http://localhost:${PORT}`));
