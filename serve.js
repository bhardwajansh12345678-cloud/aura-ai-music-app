const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5500; 

app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// THE MEDIA PROXY: This fixes the "Search Failed" & "Format Error"
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('No URL provided');

    try {
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mpeg');
        response.data.pipe(res);
    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).send('Proxy failed');
    }
});

app.use((req, res, next) => {
    if (req.method !== 'GET' || path.extname(req.path)) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`🎵 Aura AI Server LIVE on port ${PORT}`));
