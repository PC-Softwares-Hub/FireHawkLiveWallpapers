// Local test server for Firehawk Wallpapers
// Mimics Netlify behavior - serves static files & runs the download proxy
// Usage: node server.js
// Then open: http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.php': 'text/plain'
};

function serveStaticFile(res, filePath) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Netlify download function (same logic as netlify/functions/download.js)
function handleDownload(req, res) {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const url = urlObj.searchParams.get('url');
    const filename = urlObj.searchParams.get('filename') || 'wallpaper.mp4';
    
    if (!url || !url.startsWith('https://cloud.wallsflow.com/files/')) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid URL');
        return;
    }
    
    const options = new URL(url);
    const proxyReq = https.request({
        hostname: options.hostname,
        path: options.pathname + options.search,
        method: 'GET',
        headers: {
            'Referer': 'https://wallsflow.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000 // 10 second timeout
    }, (proxyRes) => {
        if (proxyRes.statusCode !== 200) {
            if (!res.headersSent) {
                res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end(`Remote server returned status: ${proxyRes.statusCode}`);
            }
            return;
        }

        res.writeHead(200, {
            'Content-Type': proxyRes.headers['content-type'] || 'video/mp4',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
        });
        proxyRes.pipe(res);
    });
    
    proxyReq.on('timeout', () => {
        proxyReq.destroy();
    });

    proxyReq.on('error', (error) => {
        console.error(`Proxy Error: ${error.message}`);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end(`Error: ${error.message}`);
        }
    });
    
    proxyReq.end();
}

const server = http.createServer((req, res) => {
    console.log(`${new Date().toLocaleTimeString()} - ${req.url}`);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*'
        });
        res.end();
        return;
    }

    // Handle the download proxy at the Netlify functions path
    if (req.url.startsWith('/.netlify/functions/download')) {
        return handleDownload(req, res);
    }
    
    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    serveStaticFile(res, filePath);
});

server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Firehawk Wallpapers - Local Test Server`);
    console.log(`========================================`);
    console.log(`\n  Open in browser: http://localhost:${PORT}`);
    console.log(`\n  Press Ctrl+C to stop the server\n`);
});