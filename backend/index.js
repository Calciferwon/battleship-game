// Simple Vercel-compatible backend entry point
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'https://battleship-frontend-game.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Basic routing
  const { url, method } = req;

  // Health check endpoint
  if (url === '/api/health' || url === '/health') {
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Battleship Backend API is running on Vercel',
      version: '1.0.0'
    });
  }

  // Root endpoint
  if (url === '/' || url === '/api') {
    return res.json({
      message: 'Battleship Backend API',
      version: '1.0.0',
      status: 'running',
      platform: 'Vercel Serverless',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /health - Health check',
        'GET / - API info',
        'GET|POST /api/game?action=<action> - Game operations'
      ],
      gameActions: [
        'getRooms - Get available game rooms',
        'createRoom - Create a new game room',
        'joinRoom - Join an existing room',
        'leaveRoom - Leave current room', 
        'placeShips - Place ships on board',
        'attack - Make an attack',
        'getGameState - Get current game state',
        'sendMessage - Send chat message'
      ],
      note: 'This is a serverless function running on Vercel. Socket.IO has been replaced with REST API + Supabase Realtime for better serverless compatibility.'
    });
  }

  // 404 for unknown endpoints
  return res.status(404).json({
    error: 'Endpoint not found',
    url: url,
    method: method,
    availableEndpoints: ['/', '/health', '/api/health', '/api/game']
  });
}