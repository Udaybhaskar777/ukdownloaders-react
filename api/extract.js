export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Video URL is required' });
  }

  // Vercel Environment Variable nunchi 5 keys teeskuntundhi (Fallback ga nee keys)
  const envKeys = process.env.RAPIDAPI_KEYS
    ? process.env.RAPIDAPI_KEYS.split(',').map((k) => k.trim())
    : [
        '924045c884msh0d662604466b4cfp1efc32jsn85195d2d7f4a',
        'd9e480d16amsh68a8d05b9bee6dap12fa52jsndc95d9598956',
        '8509bd0262msh8fb734abef7f8f9p14d644jsn5e96d851f2ef',
        '411f70fe4bmsh20016b35e839f9dp108774jsn0984f2fdb533',
        '8ce8e83701msh89349c116a381d2p119731jsn3d24def90155',
      ];

  // Random Key Rotation
  const selectedKey = envKeys[Math.floor(Math.random() * envKeys.length)];

  try {
    const apiRes = await fetch(
      'https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'social-download-all-in-one.p.rapidapi.com',
          'x-rapidapi-key': selectedKey,
        },
        body: JSON.stringify({ url: url.trim() }),
      }
    );

    const data = await apiRes.json();

    if (data.error === true) {
      return res.status(400).json({
        error: 'Could not process link. Please check if the URL is public and correct.',
      });
    }
    if (data.message && !data.medias) {
      return res.status(429).json({ error: `System Busy: ${data.message}` });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Connection Error: ' + err.message });
  }
}