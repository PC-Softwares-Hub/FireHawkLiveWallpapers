// Netlify serverless function to proxy video downloads
// Bypasses hotlink protection by faking the Referer header

const https = require('https');

exports.handler = async (event) => {
    const url = event.queryStringParameters.url;
    const filename = event.queryStringParameters.filename || 'wallpaper.mp4';
    
    // Validate URL
    if (!url || !url.startsWith('https://cloud.wallsflow.com/files/')) {
        return {
            statusCode: 400,
            body: 'Invalid URL'
        };
    }
    
    return new Promise((resolve, reject) => {
        const options = new URL(url);
        const req = https.request({
            hostname: options.hostname,
            path: options.pathname + options.search,
            method: 'GET',
            headers: {
                'Referer': 'https://wallsflow.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 8000 // 8 second timeout for serverless
        }, (res) => {
            if (res.statusCode !== 200) {
                resolve({ statusCode: res.statusCode, body: 'Remote error' });
                return;
            }

            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                // Note: Netlify has a ~6MB response limit for non-streaming functions
                resolve({
                    statusCode: 200,
                    headers: {
                        'Content-Type': res.headers['content-type'] || 'video/mp4',
                        'Content-Disposition': `attachment; filename="${filename}"`,
                        'Cache-Control': 'no-cache'
                    },
                    body: buffer.toString('base64'),
                    isBase64Encoded: true
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                statusCode: 500,
                body: `Error: ${error.message}`
            });
        });
        
        req.end();
    });
};