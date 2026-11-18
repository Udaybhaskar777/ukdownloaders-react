export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('Missing audio URL');
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://www.instagram.com/',
      },
    });

    if (!upstream.ok) {
      return res.redirect(url);
    }

    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="ukdownloaders-audio.m4a"');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    const arrayBuffer = await upstream.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch {
    res.redirect(url);
  }
}