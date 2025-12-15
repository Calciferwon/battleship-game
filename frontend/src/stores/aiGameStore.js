import { create } from 'zustand';
import { createEmptyBoard, createEmptyShips, GAME_STATUS, CELL_STATES } from '../utils/gameConstants';
import { processAttack, areAllShipsSunk, generateRandomPlacement } from '../utils/gameHelpers';
import AIOpponent from '../services/aiOpponent';

const useAIGameStore = create((set, get) => ({
  // Game state
  gameId: `ai-${Date.now()}`,
  status: GAME_STATUS.SETUP,
  difficulty: 'medium', // 'easy', 'medium', 'hard'

  // Players
  myUsername: 'Player',
  opponentUsername: 'AI Opponent',

  // Boards
  myBoard: createEmptyBoard(),
  opponentBoard: createEmptyBoard(),

  // Ships
  myShips: createEmptyShips(),
  opponentShips: createEmptyShips(),

  // Turn management
  isMyTurn: true,
  turnCount: 0,
  turnTimeRemaining: 30,
  turnTimerId: null,

  // Game flow
  moves: [],
  winner: null,
  winReason: null,

  // UI state
  isLoading: false,
  error: null,
  lastMove: null,
  aiThinking: false,

  // AI instance
  ai: null,

  /**
   * Start turn timer
   */
  startTurnTimer: () => {
    const state = get();
    
    // Clear any existing timer
    if (state.turnTimerId) {
      clearInterval(state.turnTimerId);
    }

    // Set initial time
    set({ turnTimeRemaining: 30 });

    // Start countdown
    const timerId = setInterval(() => {
      const currentState = get();
      const newTime = currentState.turnTimeRemaining - 1;

      if (newTime <= 0) {
        // Time's up! Switch to AI turn
        clearInterval(currentState.turnTimerId);
        set({ 
          turnTimeRemaining: 0,
          turnTimerId: null,
          isMyTurn: false 
        });
        
        // Let AI make its move after a short delay
        setTimeout(() => {
          get().aiAttack();
        }, 500);
      } else {
        set({ turnTimeRemaining: newTime });
      }
    }, 1000);

    set({ turnTimerId: timerId });
  },

  /**
   * Stop turn timer
   */
  stopTurnTimer: () => {
    const state = get();
    if (state.turnTimerId) {
      clearInterval(state.turnTimerId);
      set({ turnTimerId: null, turnTimeRemaining: 30 });
    }
  },

  /**
   * Start a new AI game
   */
  startNewGame: (difficulty = 'medium', username = 'Player') => {
    const ai = new AIOpponent(difficulty);
    
    // Generate random placement for AI ships
    const { ships: aiShips, board: aiBoard } = generateRandomPlacement(createEmptyShips());

    set({
      gameId: `ai-${Date.now()}`,
      status: GAME_STATUS.SETUP,
      difficulty,
      myUsername: username,
      opponentUsername: `AI (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`,
      myBoard: createEmptyBoard(),
      opponentBoard: createEmptyBoard(), // Player can't see AI ships
      myShips: createEmptyShips(),
      opponentShips: aiShips,
      _aiBoard: aiBoard, // Hidden board with AI ships
      isMyTurn: true,
      turnCount: 0,
      moves: [],
      winner: null,
      winReason: null,
      isLoading: false,
      error: null,
      lastMove: null,
      aiThinking: false,
      ai,
    });
  },

  /**
   * Place player ships and start game
   */
  startPlaying: (ships, board) => {
    set({
      myShips: ships,
      myBoard: board,
      status: GAME_STATUS.PLAYING,
      isMyTurn: true,
      turnTimeRemaining: 30,
    });
    
    // Start the turn timer
    get().startTurnTimer();
  },

  /**
   * Use random placement for player ships
   */
  randomPlaceShips: () => {
    const { ships, board } = generateRandomPlacement(createEmptyShips());
    set({
      myShips: ships,
      myBoard: board,
    });
  },

  /**
   * Player attacks AI
   */
  attackCell: async (x, y) => {
    const state = get();
    
    if (state.status !== GAME_STATUS.PLAYING) {
      console.log('Game not in playing state');
      return;
    }

    if (!state.isMyTurn) {
      console.log('Not your turn');
      return;
    }

    if (state.aiThinking) {
      console.log('AI is thinking');
      return;
    }

    // Stop the turn timer
    state.stopTurnTimer();

    // Check if cell already attacked
    const cellState = state.opponentBoard[y][x];
    if (cellState === CELL_STATES.HIT || cellState === CELL_STATES.MISS) {
      set({ error: 'Already attacked this cell' });
      // Restart timer since attack was invalid
      setTimeout(() => state.startTurnTimer(), 100);
      return;
    }

    // Process attack on hidden AI board
    const attackResult = processAttack(state._aiBoard, state.opponentShips, x, y);
    
    if (!attackResult.valid) {
      set({ error: 'Invalid attack' });
      // Restart timer since attack was invalid
      setTimeout(() => state.startTurnTimer(), 100);
      return;
    }

    const isHit = attackResult.result === 'hit';
    const isSunk = attackResult.sunk;

    // Update opponent board (what player sees)
    const newOpponentBoard = state.opponentBoard.map(row => [...row]);
    newOpponentBoard[y][x] = isHit ? CELL_STATES.HIT : CELL_STATES.MISS;

    // Update AI board (hidden)
    const newAiBoard = attackResult.board;

    // Update AI ships with hits
    const newOpponentShips = state.opponentShips.map(ship => {
      if (isHit && ship.id === attackResult.shipId) {
        return {
          ...ship,
          hits: attackResult.hits,
          sunk: isSunk
        };
      }
      return ship;
    });

    // Create move record
    const move = {
      player: 'player',
      x,
      y,
      result: isHit ? 'hit' : 'miss',
      sunkShip: isSunk ? newOpponentShips.find(s => s.id === attackResult.shipId) : null,
      timestamp: Date.now(),
    };

    const newMoves = [...state.moves, move];
    const newTurnCount = state.turnCount + 1;

    // Check if player won
    if (areAllShipsSunk(newOpponentShips)) {
      state.stopTurnTimer();
      set({
        opponentBoard: newOpponentBoard,
        opponentShips: newOpponentShips,
        _aiBoard: newAiBoard,
        moves: newMoves,
        turnCount: newTurnCount,
        status: GAME_STATUS.FINISHED,
        winner: 'player',
        winReason: 'All enemy ships destroyed!',
        lastMove: move,
        isMyTurn: false,
      });
      return;
    }

    // Update state after player attack
    set({
      opponentBoard: newOpponentBoard,
      opponentShips: newOpponentShips,
      _aiBoard: newAiBoard,
      moves: newMoves,
      turnCount: newTurnCount,
      lastMove: move,
      isMyTurn: false,
      error: null,
    });

    // AI's turn after a delay
    setTimeout(() => {
      get().aiAttack();
    }, 1000 + Math.random() * 1000); // 1-2 second delay
  },

  /**
   * AI attacks player
   */
  aiAttack: async () => {
    const state = get();

    if (state.status !== GAME_STATUS.PLAYING) {
      return;
    }

    if (state.isMyTurn || state.aiThinking) {
      return;
    }

    set({ aiThinking: true });

    // AI decides where to attack
    const { x, y } = state.ai.getNextMove(state.myBoard, state.myShips);

    // Process attack on player board
    const attackResult = processAttack(state.myBoard, state.myShips, x, y);
    
    if (!attackResult.valid) {
      console.error('AI made invalid move:', x, y);
      set({ aiThinking: false, isMyTurn: true });
      return;
    }

    const isHit = attackResult.result === 'hit';
    const isSunk = attackResult.sunk;

    // Get ship size if sunk (for AI learning)
    let shipSize = null;
    if (isSunk && attackResult.shipId) {
      const sunkShip = state.myShips.find(s => s.id === attackResult.shipId);
      if (sunkShip) {
        shipSize = sunkShip.size;
      }
    }

    // Let AI process the result
    state.ai.processAttackResult(x, y, isHit, isSunk, shipSize);

    // Update player board
    const newMyBoard = attackResult.board;

    // Update player ships with hits
    const newMyShips = state.myShips.map(ship => {
      if (isHit && ship.id === attackResult.shipId) {
        return {
          ...ship,
          hits: attackResult.hits,
          sunk: isSunk
        };
      }
      return ship;
    });

    // Create move record
    const move = {
      player: 'ai',
      x,
      y,
      result: isHit ? 'hit' : 'miss',
      sunkShip: isSunk ? newMyShips.find(s => s.id === attackResult.shipId) : null,
      timestamp: Date.now(),
    };

    const newMoves = [...state.moves, move];
    const newTurnCount = state.turnCount + 1;

    // Check if AI won
    if (areAllShipsSunk(newMyShips)) {
      state.stopTurnTimer();
      set({
        myBoard: newMyBoard,
        myShips: newMyShips,
        moves: newMoves,
        turnCount: newTurnCount,
        status: GAME_STATUS.FINISHED,
        winner: 'ai',
        winReason: 'AI destroyed all your ships!',
        lastMove: move,
        aiThinking: false,
        isMyTurn: false,
      });
      return;
    }

    // Update state after AI attack
    set({
      myBoard: newMyBoard,
      myShips: newMyShips,
      moves: newMoves,
      turnCount: newTurnCount,
      lastMove: move,
      isMyTurn: true,
      aiThinking: false,
    });
    
    // Start timer for player's next turn
    setTimeout(() => {
      get().startTurnTimer();
    }, 100);
  },

  /**
   * Reset game
   */
  resetGame: () => {
    const state = get();
    state.stopTurnTimer();
    const { difficulty, myUsername } = state;
    state.startNewGame(difficulty, myUsername);
  },

  /**
   * Set difficulty
   */
  setDifficulty: (difficulty) => {
    set({ difficulty });
    if (get().ai) {
      get().ai.setDifficulty(difficulty);
    }
  },
}));

export default useAIGameStore;
