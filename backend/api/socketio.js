import { Server } from 'socket.io';
import { socketAuthMiddleware } from '../middleware/socketAuth.js';
import gameManager from '../gameManager.js';

export default function SocketHandler(req, res) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new Server(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      },
    });
    
    res.socket.server.io = io;

    // Apply Socket.IO authentication middleware
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
      console.log(`🔗 New connection: ${socket.id} (User: ${socket.username})`);

      // Join user to their personal room for direct messaging
      socket.join(`user:${socket.userId}`);

      // ============ LOBBY EVENTS ============

      /**
       * Get list of available rooms
       */
      socket.on('lobby:getRooms', () => {
        try {
          const rooms = gameManager.getAvailableRooms();
          socket.emit('lobby:roomList', rooms);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      /**
       * Create a new room
       */
      socket.on('lobby:createRoom', ({ isPrivate = false }) => {
        try {
          const room = gameManager.createRoom(socket.userId, socket.username, isPrivate);

          // Join the socket.io room
          socket.join(room.id);

          // Send room data to creator
          socket.emit('lobby:roomCreated', {
            roomId: room.id,
            isPrivate: room.isPrivate,
          });

          // Broadcast updated room list (if public room)
          if (!isPrivate) {
            io.emit('lobby:roomList', gameManager.getAvailableRooms());
          }

          console.log(`🏠 ${socket.username} created room: ${room.id} (Private: ${isPrivate})`);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      /**
       * Join an existing room
       */
      socket.on('lobby:joinRoom', ({ roomId }) => {
        try {
          const room = gameManager.joinRoom(roomId, socket.userId, socket.username);

          // Join the socket.io room
          socket.join(roomId);

          // Send room data to joiner
          socket.emit('lobby:roomJoined', { roomId });

          // Notify both players that game is ready for setup
          io.to(roomId).emit('game:setupPhase', {
            roomId: room.id,
            players: room.players.map((p) => ({
              id: p.id,
              username: p.username,
            })),
          });

          // Broadcast updated room list (room is now full)
          io.emit('lobby:roomList', gameManager.getAvailableRooms());

          console.log(`🎮 ${socket.username} joined room: ${roomId}`);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      /**
       * Quick match - join first available room or create new one
       */
      socket.on('lobby:quickMatch', () => {
        try {
          const availableRooms = gameManager.getAvailableRooms();

          if (availableRooms.length > 0) {
            // Join first available room
            const roomId = availableRooms[0].id;
            socket.emit('lobby:joinRoom', { roomId });
          } else {
            // Create new public room
            socket.emit('lobby:createRoom', { isPrivate: false });
          }
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // ============ GAME EVENTS ============

      /**
       * Place ships
       */
      socket.on('game:placeShips', ({ roomId, ships, board }) => {
        try {
          const room = gameManager.placeShips(roomId, socket.userId, ships, board);

          // Send confirmation to player
          socket.emit('game:shipsPlaced', { success: true });

          // Check if both players are ready
          if (room.status === 'playing') {
            // Both players ready - start game!
            const gameStates = room.players.map((p) =>
              gameManager.getGameStateForPlayer(roomId, p.id)
            );

            // Send game state to each player
            room.players.forEach((player, index) => {
              io.to(`user:${player.id}`).emit('game:start', gameStates[index]);
            });

            console.log(`🎮 Game started in room: ${roomId}`);
          } else {
            // Notify other player that this player is ready
            socket.to(roomId).emit('game:opponentReady', {
              playerId: socket.userId,
            });
          }
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      /**
       * Make an attack
       */
      socket.on('game:attack', ({ roomId, x, y }) => {
        try {
          const { room, result } = gameManager.makeAttack(
            roomId,
            socket.userId,
            x,
            y
          );

          // Send result to attacker
          const attackerState = gameManager.getGameStateForPlayer(
            roomId,
            socket.userId
          );
          socket.emit('game:attackResult', {
            x,
            y,
            result,
            gameState: attackerState,
          });

          // Get defender
          const defender = room.players.find((p) => p.id !== socket.userId);

          // Send result to defender
          const defenderState = gameManager.getGameStateForPlayer(
            roomId,
            defender.id
          );
          io.to(`user:${defender.id}`).emit('game:attacked', {
            x,
            y,
            result,
            gameState: defenderState,
          });

          // If game over, notify both
          if (result.gameOver) {
            io.to(roomId).emit('game:over', {
              winner: result.winner,
              winnerUsername: room.players.find((p) => p.id === result.winner)
                ?.username,
            });

            console.log(
              `🏆 Game over in room ${roomId}. Winner: ${result.winner}`
            );
          }
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      /**
       * Get current game state
       */
      socket.on('game:getState', ({ roomId }) => {
        try {
          const gameState = gameManager.getGameStateForPlayer(roomId, socket.userId);

          if (!gameState) {
            socket.emit('error', { message: 'Game not found' });
            return;
          }

          socket.emit('game:state', gameState);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      /**
       * Leave game
       */
      socket.on('game:leave', ({ roomId }) => {
        try {
          const room = gameManager.leaveRoom(socket.userId);

          if (room) {
            // Notify opponent
            socket.to(roomId).emit('game:opponentLeft', {
              playerId: socket.userId,
              username: socket.username,
            });

            // Leave socket.io room
            socket.leave(roomId);

            // Broadcast updated room list
            io.emit('lobby:roomList', gameManager.getAvailableRooms());

            console.log(`🚪 ${socket.username} left room: ${roomId}`);
          }

          socket.emit('game:left', { success: true });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // ============ CHAT EVENTS ============

      /**
       * Send chat message
       */
      socket.on('chat:sendMessage', ({ gameId, message }) => {
        try {
          // Validate message
          if (!message || typeof message !== 'string' || message.trim().length === 0) {
            socket.emit('error', { message: 'Invalid message' });
            return;
          }

          if (message.length > 200) {
            socket.emit('error', { message: 'Message too long (max 200 characters)' });
            return;
          }

          // Send message to room (including sender)
          io.to(gameId).emit('chat:message', {
            userId: socket.userId,
            username: socket.username,
            message: message.trim(),
            timestamp: new Date().toISOString(),
          });

          console.log(`💬 Chat message in ${gameId} from ${socket.username}: ${message.trim()}`);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      /**
       * Typing indicator
       */
      socket.on('chat:typing', ({ gameId, isTyping }) => {
        try {
          // Broadcast typing status to room (except sender)
          socket.to(gameId).emit('chat:typing', {
            userId: socket.userId,
            isTyping,
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // ============ DISCONNECT ============

      socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id} (User ID: ${socket.userId})`);

        // Handle player leaving game
        const room = gameManager.getRoomByPlayer(socket.userId);

        if (room) {
          // Player was in a game
          gameManager.leaveRoom(socket.userId);

          // Notify opponent
          socket.to(room.id).emit('game:opponentLeft', {
            playerId: socket.userId,
            username: socket.username,
          });

          // Broadcast updated room list
          io.emit('lobby:roomList', gameManager.getAvailableRooms());

          console.log(`🚪 ${socket.username} disconnected from room: ${room.id}`);
        }
      });
    });
  }
  res.end();
}