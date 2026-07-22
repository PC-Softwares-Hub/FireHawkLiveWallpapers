// Cloudflare Worker Proxy for Firehawk Wallpapers
// Copy this code into a new Cloudflare Worker at dash.cloudflare.com

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    const filename = url.searchParams.get('filename') || 'wallpaper.mp4';

    if (!targetUrl || !targetUrl.includes('cloud.wallsflow.com/files/')) {
      return new Response('Invalid URL', { status: 400 });
    }

    // Clone the request but change headers to bypass hotlink protection
    const modifiedRequest = new Request(targetUrl, {
      method: 'GET',
      headers: {
        'Referer': 'https://wallsflow.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const response = await fetch(modifiedRequest);

    // Stream the video back to the user with download headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
};