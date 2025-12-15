import { create } from 'zustand';
import { createEmptyBoard, createEmptyShips, GAME_STATUS } from '../utils/gameConstants';
import { processAttack, areAllShipsSunk } from '../utils/gameHelpers';

const useGameStore = create((set, get) => ({
  // Game state
  gameId: null,
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

  // Actions

  /**
   * Initialize a new game
   */
  initGame: (gameId, myId, opponentId, myUsername, opponentUsername) => {
    set({
      gameId,
      myId,
      opponentId,
      myUsername,
      opponentUsername,
      status: GAME_STATUS.SETUP,
      myBoard: createEmptyBoard(),
      opponentBoard: createEmptyBoard(),
      myShips: createEmptyShips(),
      opponentShips: createEmptyShips(),
      moves: [],
      turnCount: 0,
      winner: null,
      error: null,
    });
  },

  /**
   * Set my ships after placement
   */
  setMyShips: (ships, board) => {
    set({
      myShips: ships,
      myBoard: board,
    });
  },

  /**
   * Start the game (both players ready)
   */
  startGame: (firstPlayerId) => {
    const { myId } = get();
    set({
      status: GAME_STATUS.PLAYING,
      currentTurn: firstPlayerId,
      isMyTurn: firstPlayerId === myId,
      turnCount: 0,
    });
  },

  /**
   * Make an attack on opponent's board
   */
  makeAttack: (x, y) => {
    const { opponentBoard, opponentShips, myId } = get();

    const result = processAttack(opponentBoard, opponentShips, x, y);

    if (!result.valid) {
      set({ error: 'Invalid move' });
      return null;
    }

    // Update opponent board
    set({ opponentBoard: result.board });

    // If ship was hit, update ship status
    if (result.shipId) {
      const updatedShips = opponentShips.map((ship) => {
        if (ship.id === result.shipId) {
          return {
            ...ship,
            hits: result.hits,
            sunk: result.sunk,
          };
        }
        return ship;
      });

      set({ opponentShips: updatedShips });

      // Check win condition
      if (areAllShipsSunk(updatedShips)) {
        set({
          status: GAME_STATUS.FINISHED,
          winner: myId,
          winReason: 'all_ships_sunk',
        });
      }
    }

    // Add move to history
    const move = {
      playerId: myId,
      position: { x, y },
      result: result.result,
      shipSunk: result.sunk ? result.shipId : null,
      timestamp: new Date(),
    };

    set((state) => ({
      moves: [...state.moves, move],
      lastMove: move,
      isMyTurn: false, // Turn will switch after opponent acknowledges
    }));

    return result;
  },

  /**
   * Process opponent's attack on my board
   */
  receiveAttack: (x, y, opponentId) => {
    const { myBoard, myShips } = get();

    const result = processAttack(myBoard, myShips, x, y);

    if (!result.valid) {
      return null;
    }

    // Update my board
    set({ myBoard: result.board });

    // If ship was hit, update ship status
    if (result.shipId) {
      const updatedShips = myShips.map((ship) => {
        if (ship.id === result.shipId) {
          return {
            ...ship,
            hits: result.hits,
            sunk: result.sunk,
          };
        }
        return ship;
      });

      set({ myShips: updatedShips });

      // Check loss condition
      if (areAllShipsSunk(updatedShips)) {
        set({
          status: GAME_STATUS.FINISHED,
          winner: opponentId,
          winReason: 'all_ships_sunk',
        });
      }
    }

    // Add move to history
    const move = {
      playerId: opponentId,
      position: { x, y },
      result: result.result,
      shipSunk: result.sunk ? result.shipId : null,
      timestamp: new Date(),
    };

    set((state) => ({
      moves: [...state.moves, move],
      lastMove: move,
    }));

    return result;
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
    set({
      gameId: null,
      status: GAME_STATUS.WAITING,
      myBoard: createEmptyBoard(),
      opponentBoard: createEmptyBoard(),
      myShips: createEmptyShips(),
      opponentShips: createEmptyShips(),
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

  /**
   * Create a tournament game (simplified - just initialize game state)
   */
  createTournamentGame: async ({ matchId, tournamentId, opponentId }) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log('🎮 Creating tournament game:', { matchId, tournamentId, opponentId });
      
      // For tournaments, we just initialize the game state
      // The actual game will be created when both players are ready
      set({
        gameId: matchId, // Use match ID as game ID for tournament games
        status: GAME_STATUS.WAITING,
        opponentId,
        isLoading: false,
      });
      
      return { matchId, tournamentId, opponentId };
    } catch (error) {
      console.error('🎮 Error creating tournament game:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Initialize tournament game with boards
   */
  initTournamentGame: ({ matchId, myBoard, opponentBoard, myShips, opponentId }) => {
    try {
      console.log('🎮 initTournamentGame called with:', {
        matchId,
        myBoardSize: myBoard?.length,
        opponentBoardSize: opponentBoard?.length,
        myShipsCount: myShips?.length,
        opponentId,
      });

      if (!myBoard || !Array.isArray(myBoard) || myBoard.length === 0) {
        console.error('🎮 Invalid myBoard:', myBoard);
        return;
      }

      set({
        gameId: matchId,
        opponentId,
        myBoard,
        opponentBoard,
        myShips,
        opponentShips: createEmptyShips(),
        status: GAME_STATUS.PLAYING,
        isMyTurn: false,
      });

      console.log('🎮 Tournament game initialized successfully');
    } catch (error) {
      console.error('🎮 Error in initTournamentGame:', error);
      console.error('🎮 Error details:', error.message, error.stack);
    }
  },

  /**
   * Get current game state (for components needing full state)
   */
  gameState: null,
  getGameState: () => {
    const state = get();
    return {
      gameId: state.gameId,
      status: state.status,
      myId: state.myId,
      opponentId: state.opponentId,
      myUsername: state.myUsername,
      opponentUsername: state.opponentUsername,
      myBoard: state.myBoard,
      opponentBoard: state.opponentBoard,
      myShips: state.myShips,
      opponentShips: state.opponentShips,
      isMyTurn: state.isMyTurn,
      winner: state.winner,
      moves: state.moves,
    };
  },
}));

export default useGameStore;
