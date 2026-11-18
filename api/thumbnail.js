export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing URL');

  try {
    const imgRes = await fetch(url);
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="ukdownloaders-thumb.jpg"');
    res.send(buffer);
  } catch {
    res.redirect(url);
  }
}