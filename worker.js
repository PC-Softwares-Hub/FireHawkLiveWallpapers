// Cloudflare Worker Proxy for Firehawk Wallpapers
// Copy this code into a new Cloudflare Worker at dash.cloudflare.com

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    const filename = url.searchParams.get('filename') || 'wallpaper.mp4';

    if (!targetUrl || (!targetUrl.includes('cloud.wallsflow.com/files/') && !targetUrl.includes('cloud.wallsflow.com/posts/'))) {
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

    // Stream the response back to the user
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');

    // Only set download attachment header for video files, not images
    const isVideo = targetUrl.includes('cloud.wallsflow.com/files/');
    if (isVideo) {
      newHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
};