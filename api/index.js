export default async function handler(req: any, res: any) {
  try {
    return res.status(200).json({
      success: true,
      url: req.url,
      originalUrl: req.originalUrl,
      query: req.query,
      headers: {
        host: req.headers['host'],
        'x-matched-path': req.headers['x-matched-path'],
        'x-forwarded-uri': req.headers['x-forwarded-uri'],
        'x-vercel-id': req.headers['x-vercel-id'],
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
