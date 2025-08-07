// Simple health check endpoint for Vercel
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      success: true,
      message: 'Backend is running',
      timestamp: new Date().toISOString(),
      routes: [
        'GET /api/health',
        'GET /api/timers/active',
        'POST /api/timers',
        'GET /api/project-families',
        'POST /api/project-families'
      ]
    });
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}
