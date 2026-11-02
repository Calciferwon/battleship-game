// Import game handler
import gameHandler from './game.js';

// Simple Vercel-compatible backend entry point
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
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

  // Documentation endpoint
  if (url === '/docs' || url === '/api/docs') {
    return res.json({
      title: 'Battleship Backend API Documentation',
      version: '1.0.0',
      baseUrl: `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`,
      endpoints: {
        'GET /': 'API information',
        'GET /health': 'Health check',
        'GET /docs': 'API documentation',
        'GET /api/game?action=getRooms': 'Get available game rooms',
        'POST /api/game?action=createRoom': 'Create a new game room',
        'POST /api/game?action=joinRoom': 'Join an existing room',
        'POST /api/game?action=leaveRoom': 'Leave current room',
        'POST /api/game?action=placeShips': 'Place ships on board',
        'POST /api/game?action=attack': 'Make an attack',
        'GET /api/game?action=getGameState': 'Get current game state',
        'POST /api/game?action=sendMessage': 'Send chat message'
      },
      authentication: 'Bearer token required in Authorization header',
      cors: `Enabled for ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`
    });
  }

  // Game API endpoint
  if (url.startsWith('/api/game')) {
    return await gameHandler(req, res);
  }

  // 404 for unknown endpoints
  return res.status(404).json({
    error: 'Endpoint not found',
    url: url,
    method: method,
    availableEndpoints: ['/', '/health', '/api/health', '/api/game', '/docs']
  });
}