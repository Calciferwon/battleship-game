import { create } from 'zustand';
import { createEmptyBoard, createEmptyShips, GAME_STATUS } from '../utils/gameConstants';
import { processAttack, areAllShipsSunk } from '../utils/gameHelpers';
import realtimeGameService from '../services/realtimeGameService';

const useGameStore = create((set, get) => ({
  // Game state
  gameId: null,
  roomId: null,
  status: GAME_STATUS.WAITING,

  // Players
  myId: null,
  opponentId: null,
  myUsername: null,
  opponentUsername: null,

  // Boards
  myBoard: createEmptyBoard(),
  opponentBoard: createEmptyBoard(),

  // Ships
  myShips: createEmptyShips(),
  opponentShips: createEmptyShips(),

  // Turn management
  currentTurn: null,
  isMyTurn: false,
  turnCount: 0,

  // Game flow
  moves: [],
  winner: null,
  winReason: null,

  // UI state
  isLoading: false,
  error: null,
  lastMove: null,
  isServiceInitialized: false,
  isAttacking: false, // Lock to prevent double-clicks

  // Real-time subscriptions
  subscriptions: new Set(),
  
  // Polling intervals
  turnPollInterval: null,
  gameStartPollInterval: null,

  // Computed property for currentGame (for compatibility with GameScreen)
  get currentGame() {
    const state = get();
    return {
      game: {
        id: state.gameId,
        room_id: state.roomId,
        status: state.status,
        player1_id: state.myId,
        player2_id: state.opponentId,
        player1_username: state.myUsername,
        player2_username: state.opponentUsername,
        player1_board: state.myBoard,
        player2_board: state.opponentBoard,
        player1_ships: state.myShips,
        player2_ships: state.opponentShips,
        current_turn: state.currentTurn,
        winner_id: state.winner,
      },
      moves: state.moves
    };
  },

  // Actions

  /**
   * Initialize the game service with user
   */
  initService: async (user, session) => {
    // Clean up any existing subscriptions first (important for page refresh)
    console.log('🧹 initService: Cleaning up existing subscriptions before init');
    realtimeGameService.unsubscribeAll();
    get().stopTurnPolling();
    get().stopGameStartPolling();
    
    await realtimeGameService.init(user);
    if (session) {
      realtimeGameService.setSession(session);
    }
    set({ 
      myId: user.id, 
      myUsername: user.user_metadata?.username || user.email,
      isServiceInitialized: true
    });
  },

  /**
   * Initialize a new game/room
   */
  initGame: (gameData) => {
    const { gameId, roomId, myId, opponentId, myUsername, opponentUsername } = gameData;
    
    set({
      gameId,
      roomId,
      myId,
      opponentId,
      myUsername,
      opponentUsername,
      status: GAME_STATUS.SETUP,
      myBoard: createEmptyBoard(),
      opponentBoard: createEmptyBoard(),
      myShips: null, // null indicates ships not placed yet
      opponentShips: null, // null indicates ships not placed yet
      currentTurn: null,
      isMyTurn: false,
      turnCount: 0,
      moves: [],
      winner: null,
      winReason: null,
      error: null,
    });

    // Subscribe to room events
    get().subscribeToRoom(roomId);
  },

  /**
   * Subscribe to room events
   */
  subscribeToRoom: (roomId) => {
    if (!roomId) {
      console.warn('⚠️ subscribeToRoom: No roomId provided, skipping subscription');
      return;
    }
    
    // Check if already subscribed
    const channelKey = `room_${roomId}`;
    if (realtimeGameService.channels.has(channelKey)) {
      console.log('✅ subscribeToRoom: Already subscribed to room:', roomId);
      return;
    }
    
    console.log('🔔 subscribeToRoom: Subscribing to room:', roomId);
    
    const handlers = {
      onRoomJoined: (data) => {
        console.log('👋 Player joined (room_joined event):', data);
        const { userId, username } = data;
        
        if (userId !== get().myId) {
          console.log('🎉 OPPONENT JOINED! Setting opponent info:', { userId, username });
          set({
            opponentId: userId,
            opponentUsername: username,
            status: GAME_STATUS.SETUP
          });
        } else {
          console.log('👤 Same player (me) joined event, ignoring');
        }
      },

      onPlayerLeft: (data) => {
        console.log('🚪 Player left room:', data);
        const { userId } = data;
        
        if (userId !== get().myId) {
          set({
            opponentId: null,
            opponentUsername: null,
            status: GAME_STATUS.WAITING
          });
        }
      },

      onShipsPlaced: (data) => {
        console.log('🚢 Ships placed event received:', data);
        const { userId, ready } = data;
        
        if (userId !== get().myId && ready) {
          console.log('🎯 OPPONENT PLACED SHIPS! Calling checkGameStart...');
          // Opponent placed their ships - fetch latest game state
          get().checkGameStart();
        } else if (userId === get().myId) {
          console.log('✅ My ships placed event (ignoring, already handled locally)');
        } else {
          console.log('⚠️ Ships placed but opponent not ready yet:', { userId, ready });
        }
      },

      onGameStarted: (data) => {
        console.log('🎯 Game started:', data);
        const { gameId, firstPlayer } = data;
        
        set({
          gameId,
          status: GAME_STATUS.PLAYING,
          currentTurn: firstPlayer,
          isMyTurn: firstPlayer === get().myId
        });
      },

      onAttackMade: (data) => {
        console.log('💥 Attack made:', data);
        const { x, y, result, attackerId, nextTurn } = data;
        
        get().processIncomingAttack(x, y, result, attackerId, nextTurn);
      },

      onGameOver: (data) => {
        console.log('🏆 Game over:', data);
        const { winner } = data;
        
        set({
          status: GAME_STATUS.FINISHED,
          winner: winner,
          currentTurn: null,
          isMyTurn: false
        });
      },

      onChatMessage: (message) => {
        console.log('💬 Chat message:', message);
        // Handle chat message (can be connected to chat store)
      }
    };

    realtimeGameService.subscribeToRoom(roomId, handlers);
  },

  /**
   * Subscribe to game events
   */
  subscribeToGame: (gameId) => {
    if (!gameId) {
      console.warn('⚠️ subscribeToGame: No gameId provided, skipping subscription');
      return;
    }
    
    // Check if already subscribed
    const channelKey = `game_${gameId}`;
    if (realtimeGameService.channels.has(channelKey)) {
      console.log('✅ subscribeToGame: Already subscribed to game:', gameId);
      return;
    }
    
    console.log('🔔 subscribeToGame: Subscribing to game:', gameId);
    
    const handlers = {
      onAttackMade: (data) => {
        const { x, y, result, attackerId, nextTurn } = data;
        get().processIncomingAttack(x, y, result, attackerId, nextTurn);
      },

      onGameOver: (data) => {
        const { winner } = data;
        set({
          status: GAME_STATUS.FINISHED,
          winner: winner,
          currentTurn: null,
          isMyTurn: false
        });
      }
    };

    realtimeGameService.subscribeToGame(gameId, handlers);
  },

  /**
   * Create a new room
   */
  createRoom: async (isPrivate = false) => {
    try {
      set({ isLoading: true, error: null });
      
      // Clean up any existing room/subscriptions first
      const currentRoomId = get().roomId;
      if (currentRoomId) {
        console.log('🧹 createRoom: Leaving previous room before creating new one');
        await get().leaveRoom();
      }
      
      const result = await realtimeGameService.createRoom(isPrivate);
      const { room } = result;
      
      get().initGame({
        roomId: room.id,
        myId: get().myId,
        myUsername: get().myUsername
      });
      
      return room;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Create a tournament game room
   */
  createTournamentGame: async ({ matchId, tournamentId, opponentId }) => {
    try {
      set({ isLoading: true, error: null });
      
      const socket = realtimeGameService.socket;
      if (!socket) {
        throw new Error('Socket not connected');
      }

      return new Promise((resolve, reject) => {
        // Listen for room creation
        const successHandler = (data) => {
          socket.off('tournament:gameCreated', successHandler);
          socket.off('error', errorHandler);
          
          // Initialize game with tournament room data
          get().initGame({
            roomId: data.roomId,
            myId: get().myId,
            myUsername: get().myUsername,
            opponentId,
          });
          
          set({ isLoading: false });
          resolve(data);
        };

        const errorHandler = (error) => {
          socket.off('tournament:gameCreated', successHandler);
          socket.off('error', errorHandler);
          set({ error: error.message, isLoading: false });
          reject(error);
        };

        socket.once('tournament:gameCreated', successHandler);
        socket.once('error', errorHandler);

        // Request tournament game creation
        socket.emit('tournament:createGame', { matchId, tournamentId });
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Join an existing room
   */
  joinRoom: async (roomId) => {
    try {
      set({ isLoading: true, error: null });
      
      // If already in this room, don't rejoin
      const currentRoomId = get().roomId;
      if (currentRoomId === roomId) {
        console.log('✅ joinRoom: Already in room', roomId);
        set({ isLoading: false });
        return get().currentGame;
      }
      
      // If in a different room, clean up first
      if (currentRoomId && currentRoomId !== roomId) {
        console.log('🧹 joinRoom: Leaving previous room before joining new one');
        await get().leaveRoom();
      }
      
      const result = await realtimeGameService.joinRoom(roomId);
      const { room } = result;
      
      get().initGame({
        roomId: room.id,
        gameId: room.game_id,
        myId: get().myId,
        myUsername: get().myUsername,
        opponentId: room.player1_id === get().myId ? room.player2_id : room.player1_id,
        opponentUsername: room.player1_id === get().myId ? room.player2_username : room.player1_username
      });
      
      // If room already has a gameId, subscribe to game events
      if (room.game_id) {
        console.log('🔔 joinRoom: Room has gameId, subscribing to game events:', room.game_id);
        get().subscribeToGame(room.game_id);
      }
      
      return room;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Join a game by ID (alias for joinRoom for compatibility)
   */
  joinGame: async (gameId) => {
    // gameId in the URL is actually the roomId
    return get().joinRoom(gameId);
  },

  /**
   * Leave current room
   */
  leaveRoom: async () => {
    try {
      const { roomId } = get();
      if (!roomId) return;
      
      await realtimeGameService.leaveRoom(roomId);
      realtimeGameService.unsubscribeAll();
      
      get().resetGame();
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  /**
   * Leave game (alias for leaveRoom for compatibility)
   */
  leaveGame: async (gameId) => {
    return get().leaveRoom();
  },

  /**
   * Place ships on board
   */
  placeShips: async (roomId, ships, board) => {
    try {
      set({ isLoading: true, error: null });
      
      // Use roomId from parameter or from state
      const actualRoomId = roomId || get().roomId;
      const response = await realtimeGameService.placeShips(actualRoomId, ships, board);
      
      // Extract gameId from response
      const { gameId } = response;
      
      console.log('🎮 placeShips: Received gameId:', gameId);
      
      // Store gameId and subscribe to game events
      if (gameId && !get().gameId) {
        console.log('🔔 placeShips: Setting gameId and subscribing to game events');
        set({ gameId });
        
        // Subscribe to game events now that we have the gameId
        get().subscribeToGame(gameId);
      }
      
      set({
        myBoard: board,
        myShips: ships,
        myShipsPlaced: true,
        status: GAME_STATUS.WAITING_FOR_OPPONENT
      });
      
      get().checkGameStart();
      
      // Start polling for game start as a fallback (in case real-time events don't work)
      get().startGameStartPolling();
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Make an attack
   */
  makeAttack: async (x, y) => {
    try {
      const { roomId, isMyTurn, myId, currentTurn, isAttacking, opponentBoard } = get();
      
      console.log('⚔️ makeAttack:', { 
        x, y, 
        isMyTurn, 
        myId, 
        currentTurn,
        isAttacking,
        currentTurnMatchesMyId: currentTurn === myId
      });

      // Check if already attacking (prevent double-clicks)
      if (isAttacking) {
        console.warn('⚠️ Attack already in progress, ignoring');
        return;
      }
      
      // Check if it's my turn
      if (!isMyTurn) {
        console.error('❌ Not your turn!', { currentTurn, myId });
        throw new Error('Not your turn');
      }

      // Check if cell already attacked
      const cellState = opponentBoard[y][x];
      if (cellState === 'hit' || cellState === 'miss') {
        console.warn('⚠️ Cell already attacked', { x, y, cellState });
        throw new Error('Cell already attacked');
      }
      
      // Set attacking lock
      set({ isAttacking: true, isLoading: true, error: null });
      
      const result = await realtimeGameService.attack(roomId, x, y);
      const { result: attackResult } = result;
      
      console.log('✅ Attack result:', attackResult);
      
      // Process the attack result locally
      get().processAttackResult(x, y, attackResult);
      
      return attackResult;
    } catch (error) {
      console.error('❌ Attack error:', error);
      set({ error: error.message });
      throw error;
    } finally {
      // Always release the lock
      set({ isAttacking: false, isLoading: false });
    }
  },

  /**
   * Make a move (alias for makeAttack for compatibility)
   */
  makeMove: async (gameId, x, y) => {
    return get().makeAttack(x, y);
  },

  /**
   * Process attack result
   */
  processAttackResult: (x, y, result) => {
    const { hit, gameOver, winner, nextTurn } = result;
    
    console.log('🎯 processAttackResult:', { x, y, hit, gameOver, winner, nextTurn });
    
    set((state) => {
      const newOpponentBoard = [...state.opponentBoard];
      newOpponentBoard[y] = [...newOpponentBoard[y]];
      newOpponentBoard[y][x] = hit ? 'hit' : 'miss';
      
      const newMoves = [...state.moves, { 
        position: { x, y }, 
        result: hit ? 'hit' : 'miss',
        playerId: state.myId,
        timestamp: new Date().toISOString(),
        hit,
        isMyMove: true 
      }];
      
      console.log('🔄 Turn update:', {
        from: state.currentTurn,
        to: nextTurn,
        wasMyTurn: state.isMyTurn,
        willBeMyTurn: nextTurn === state.myId,
        myId: state.myId
      });
      
      return {
        opponentBoard: newOpponentBoard,
        moves: newMoves,
        lastMove: { 
          position: { x, y }, 
          result: hit ? 'hit' : 'miss',
          playerId: state.myId,
          timestamp: new Date().toISOString(),
          hit, 
          isMyMove: true 
        },
        currentTurn: gameOver ? null : nextTurn,
        isMyTurn: gameOver ? false : nextTurn === state.myId,
        turnCount: state.turnCount + 1,
        ...(gameOver && { status: GAME_STATUS.FINISHED, winner })
      };
    });
  },

  /**
   * Process incoming attack from opponent
   */
  processIncomingAttack: (x, y, result, attackerId, nextTurn) => {
    const { myId } = get();
    
    console.log('📨 processIncomingAttack:', { x, y, result, attackerId, nextTurn, myId });
    
    if (attackerId === myId) {
      // This is my own attack result coming back via real-time event
      // Just sync the turn state, don't re-process the move
      console.log('✅ Syncing my attack via real-time event');
      set((state) => ({
        currentTurn: nextTurn,
        isMyTurn: nextTurn === myId
      }));
      return;
    }
    
    // This is an attack on my board from opponent
    const { hit, gameOver, winner } = result;
    
    console.log('🎯 Processing opponent attack on my board');
    
    set((state) => {
      const newMyBoard = [...state.myBoard];
      newMyBoard[y] = [...newMyBoard[y]];
      newMyBoard[y][x] = hit ? 'hit' : 'miss';
      
      const newMoves = [...state.moves, { 
        position: { x, y }, 
        result: hit ? 'hit' : 'miss',
        playerId: attackerId,
        timestamp: new Date().toISOString(),
        hit, 
        isMyMove: false 
      }];
      
      return {
        myBoard: newMyBoard,
        moves: newMoves,
        lastMove: { 
          position: { x, y }, 
          result: hit ? 'hit' : 'miss',
          playerId: attackerId,
          timestamp: new Date().toISOString(),
          hit, 
          isMyMove: false 
        },
        currentTurn: gameOver ? null : nextTurn,
        isMyTurn: gameOver ? false : nextTurn === myId,
        turnCount: state.turnCount + 1,
        ...(gameOver && { status: GAME_STATUS.FINISHED, winner })
      };
    });
  },

  /**
   * Start polling for turn updates (backup for real-time)
   */
  startTurnPolling: () => {
    const interval = get().turnPollInterval;
    if (interval) {
      clearInterval(interval);
    }
    
    const newInterval = setInterval(async () => {
      const { status, roomId, myId, currentTurn } = get();
      
      // Only poll when game is active
      if (status === GAME_STATUS.PLAYING && roomId) {
        console.log('🔄 Polling for game state update...');
        try {
          const result = await realtimeGameService.getGameState(roomId);
          const { gameState } = result;
          
          if (gameState) {
            // Check if game is over
            if (gameState.status === 'completed' && gameState.winner) {
              console.log('🏆 Game over detected via polling!', {
                winner: gameState.winner,
                myId
              });
              
              get().stopTurnPolling();
              
              set({
                status: GAME_STATUS.FINISHED,
                winner: gameState.winner,
                currentTurn: null,
                isMyTurn: false,
                opponentBoard: gameState.opponentBoard || get().opponentBoard,
                myBoard: gameState.myBoard || get().myBoard
              });
              
              return;
            }
            
            // Normal turn/board update
            if (gameState.current_turn) {
              const newIsMyTurn = gameState.current_turn === myId;
              
              // Backend already returns boards correctly assigned as myBoard and opponentBoard
              const myBoard = gameState.myBoard;
              const opponentBoard = gameState.opponentBoard;
              
              // Check if turn has changed
              const turnChanged = currentTurn !== gameState.current_turn;
              
              if (turnChanged) {
                console.log('✅ Poll detected turn change!', {
                  from: currentTurn,
                  to: gameState.current_turn,
                  nowMyTurn: newIsMyTurn
                });
              }
              
              console.log('📊 Polling board update:', {
                myBoardCells: myBoard ? myBoard.flat().filter(c => c === 'hit' || c === 'miss').length : 0,
                opponentBoardCells: opponentBoard ? opponentBoard.flat().filter(c => c === 'hit' || c === 'miss').length : 0
              });
              
              // Update state with latest boards and turn
              set({
                currentTurn: gameState.current_turn,
                isMyTurn: newIsMyTurn,
                opponentBoard: opponentBoard || get().opponentBoard,
                myBoard: myBoard || get().myBoard
              });
            }
          }
        } catch (error) {
          console.error('❌ Polling error:', error);
        }
      }
    }, 2000); // Poll every 2 seconds
    
    set({ turnPollInterval: newInterval });
  },

  /**
   * Stop polling for turn updates
   */
  stopTurnPolling: () => {
    const interval = get().turnPollInterval;
    if (interval) {
      clearInterval(interval);
      set({ turnPollInterval: null });
    }
  },

  /**
   * Start polling for game start (fallback when real-time events don't fire)
   */
  startGameStartPolling: () => {
    // Stop any existing polling first
    get().stopGameStartPolling();
    
    console.log('🔄 Starting game start polling...');
    
    const newInterval = setInterval(async () => {
      const currentStatus = get().status;
      
      // Only poll if we're waiting for opponent
      if (currentStatus !== GAME_STATUS.WAITING_FOR_OPPONENT) {
        console.log('🔄 Game start polling: Not in waiting state, stopping poll');
        get().stopGameStartPolling();
        return;
      }
      
      try {
        console.log('🔄 Polling for game start...');
        await get().checkGameStart();
      } catch (error) {
        console.error('❌ Game start polling error:', error);
      }
    }, 3000); // Poll every 3 seconds
    
    set({ gameStartPollInterval: newInterval });
  },

  /**
   * Stop polling for game start
   */
  stopGameStartPolling: () => {
    const interval = get().gameStartPollInterval;
    if (interval) {
      console.log('⏹️ Stopping game start polling');
      clearInterval(interval);
      set({ gameStartPollInterval: null });
    }
  },

  /**
   * Check if game should start
   */
  checkGameStart: async () => {
    try {
      const { roomId, myId } = get();
      
      console.log('🔍 checkGameStart: Fetching game state for room:', roomId);
      
      // Get current game state to check status and readiness
      const result = await realtimeGameService.getGameState(roomId);
      const { gameState } = result;
      
      console.log('🔍 checkGameStart: Game state received:', gameState);
      
      if (gameState) {
        const { status, player1_ready, player2_ready, player1_ships, player2_ships, player1_id, player2_id, current_turn } = gameState;
        const isPlayer1 = player1_id === myId;
        
        console.log('🔍 checkGameStart: My role:', isPlayer1 ? 'Player 1' : 'Player 2');
        console.log('🔍 checkGameStart: Player states:', { 
          player1_ready, 
          player2_ready, 
          player1_id, 
          player2_id,
          status 
        });
        
        // Determine opponent info
        const opponentId = isPlayer1 ? player2_id : player1_id;
        const opponentShips = isPlayer1 ? player2_ships : player1_ships;
        const opponentReady = isPlayer1 ? player2_ready : player1_ready;
        
        console.log('🔍 checkGameStart: Opponent info:', { 
          opponentId, 
          opponentReady, 
          hasShips: !!opponentShips,
          shipsLength: opponentShips?.length 
        });
        
        // Update opponent ships and flag if they've placed them
        if (opponentReady && opponentShips) {
          set({
            opponentId: opponentId,
            opponentShips: opponentShips,
            opponentShipsPlaced: true
          });
          console.log('✅ Opponent ships detected and updated');
        } else if (opponentId) {
          // Update opponent ID even if they haven't placed ships yet
          set({ opponentId: opponentId });
          console.log('✅ Opponent ID updated:', opponentId);
        }
        
        // If game is active, start playing
        if (status === 'active') {
          const turnInfo = {
            current_turn,
            myId,
            isMyTurn: current_turn === myId
          };
          console.log('🎮 Setting game to PLAYING:', JSON.stringify(turnInfo, null, 2));
          
          // Stop game start polling since game is starting
          get().stopGameStartPolling();
          
          set({
            gameId: gameState.gameId || gameState.id,
            status: GAME_STATUS.PLAYING,
            currentTurn: current_turn,
            isMyTurn: current_turn === myId,
            opponentBoard: gameState.opponentBoard || createEmptyBoard()
          });
          console.log('✅ Game started - status set to PLAYING');
          
          // Start polling for turn updates as backup
          get().startTurnPolling();
        }
      } else {
        console.warn('⚠️ checkGameStart: No game state returned');
      }
    } catch (error) {
      console.error('❌ Error checking game start:', error);
    }
  },

  /**
   * Send chat message
   */
  sendMessage: async (message) => {
    try {
      const { roomId, gameId } = get();
      await realtimeGameService.sendMessage(roomId, gameId, message);
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  /**
   * Get current game state from server
   */
  refreshGameState: async () => {
    try {
      const { roomId } = get();
      if (!roomId) return;
      
      const result = await realtimeGameService.getGameState(roomId);
      const { gameState } = result;
      
      if (gameState) {
        set({
          gameId: gameState.gameId,
          status: gameState.status === 'active' ? GAME_STATUS.PLAYING : get().status,
          currentTurn: gameState.currentTurn,
          isMyTurn: gameState.currentTurn === get().myId,
          turnCount: gameState.turnCount,
          myBoard: gameState.myBoard || get().myBoard,
          opponentBoard: gameState.opponentBoard || get().opponentBoard,
          winner: gameState.winner
        });
      }
    } catch (error) {
      console.error('Error refreshing game state:', error);
    }
  },

  /**
   * Switch turn
   */
  switchTurn: (nextPlayerId) => {
    const { myId } = get();
    set((state) => ({
      currentTurn: nextPlayerId,
      isMyTurn: nextPlayerId === myId,
      turnCount: state.turnCount + 1,
    }));
  },

  /**
   * End game
   */
  endGame: (winnerId, reason) => {
    get().stopTurnPolling();
    
    set({
      status: GAME_STATUS.FINISHED,
      winner: winnerId,
      winReason: reason,
    });
  },

  /**
   * Reset game
   */
  resetGame: () => {
    get().stopTurnPolling();
    get().stopGameStartPolling();
    realtimeGameService.unsubscribeAll();
    
    set({
      gameId: null,
      roomId: null,
      status: GAME_STATUS.WAITING,
      opponentId: null,
      opponentUsername: null,
      myBoard: createEmptyBoard(),
      opponentBoard: createEmptyBoard(),
      myShips: null,
      opponentShips: null,
      currentTurn: null,
      isMyTurn: false,
      turnCount: 0,
      moves: [],
      winner: null,
      winReason: null,
      error: null,
      lastMove: null,
    });
  },

  /**
   * Set loading state
   */
  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Set error
   */
  setError: (error) => set({ error }),

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),
}));

export default useGameStore;