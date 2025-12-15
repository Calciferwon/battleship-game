import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useGameStoreRealtime from '../stores/gameStoreRealtime';
import { useAuth } from '../hooks/useAuth';
import { GAME_STATUS, CELL_STATES } from '../utils/gameConstants';
import ShipPlacementBoard from './ShipPlacementBoard';
import GameBoard from './GameBoard';
import TurnIndicator from './TurnIndicator';
import GameStatus from './GameStatus';
import ShipStatus from './ShipStatus';
import ChatPanel from './ChatPanel';
import GameFinishScreen from './GameFinishScreen';

const GameScreen = () => {
  const { gameId } = useParams(); // This is actually roomId from URL
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gamePhase, setGamePhase] = useState('waiting'); // waiting, setup, playing, finished
  const [error, setError] = useState(null);
  const [opponentReady, setOpponentReady] = useState(false);

  // Get game store state and actions
  const {
    roomId,
    gameId: storeGameId,
    myId: storeMyId,
    opponentId,
    myUsername,
    opponentUsername,
    myBoard,
    opponentBoard,
    myShips,
    opponentShips,
    isMyTurn,
    isAttacking,
    winner,
    status,
    moves,
    isLoading,
    error: gameError,
    isServiceInitialized,
    joinGame,
    placeShips,
    makeMove,
    leaveGame: leaveGameAction,
    subscribeToGame,
  } = useGameStoreRealtime();

  // Use storeMyId if available, fallback to user.id
  const myId = storeMyId || user?.id;
  const turnCount = moves?.length || 0;

  // Helper function to mask opponent ships (hide ship positions before they're hit)
  const getMaskedOpponentBoard = () => {
    if (!opponentBoard) return opponentBoard;
    
    return opponentBoard.map(row =>
      row.map(cell => {
        // Only show HIT and MISS states, hide ships
        if (cell === CELL_STATES.SHIP) {
          return CELL_STATES.EMPTY;
        }
        return cell;
      })
    );
  };

  const maskedOpponentBoard = getMaskedOpponentBoard();
  
  // Helper function to calculate ship health based on board hits
  const calculateShipHealth = (ships, board) => {
    if (!ships || !board) return ships || [];
    
    return ships.map(ship => {
      if (!ship.position || !ship.position.coordinates) {
        return { ...ship, hits: [], sunk: false };
      }
      
      // Count hits on this ship's coordinates
      const hits = [];
      ship.position.coordinates.forEach(coord => {
        const { x, y } = coord;
        if (board[y] && board[y][x] === 'hit') {
          hits.push(coord);
        }
      });
      
      const sunk = hits.length === ship.size;
      
      return {
        ...ship,
        hits,
        sunk
      };
    });
  };
  
  // Calculate ship health for both players
  const myShipsWithHealth = calculateShipHealth(myShips, myBoard);
  const opponentShipsWithHealth = calculateShipHealth(opponentShips, opponentBoard);
  
  // Helper function to check if ships are placed
  const areShipsPlaced = (ships) => {
    if (!ships || ships.length === 0) return false;
    // Ships are placed if all ships have a valid position
    return ships.every(ship => ship.position !== null && ship.position !== undefined);
  };

  const myShipsPlaced = areShipsPlaced(myShips);
  const opponentShipsPlaced = areShipsPlaced(opponentShips);

  // Cleanup on page refresh/close (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🚪 Page unload detected, cleaning up game...');
      const store = useGameStoreRealtime.getState();
      store.stopTurnPolling();
      store.stopGameStartPolling();
      // Note: We don't call leaveRoom here as it's async and may not complete
      // The backend will handle timeout-based cleanup
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!gameId || !myId) {
      console.log('⏳ Waiting for gameId and myId...', { gameId, myId });
      return;
    }

    if (!isServiceInitialized) {
      console.log('⏳ Waiting for realtime service to initialize...');
      return;
    }

    // Join the game and subscribe to updates
    const initializeGame = async () => {
      try {
        console.log('🎮 Initializing game:', gameId);
        
        // Only join if we're not already in this room
        if (roomId !== gameId) {
          console.log('🎮 Joining room...');
          await joinGame(gameId);
        } else {
          console.log('✅ Already in room, skipping join');
        }
        
        // Subscribe to game events using the actual game ID from store
        // Note: This might be null initially for room creators, will subscribe later when gameId is set
        if (storeGameId) {
          console.log('🔔 Subscribing to game events with gameId:', storeGameId);
          subscribeToGame(storeGameId);
        }
      } catch (err) {
        console.error('Failed to join game:', err);
        setError('Failed to join game: ' + err.message);
        // Don't navigate away immediately, show error
      }
    };

    initializeGame();

    return () => {
      // Cleanup on unmount or when dependencies change
      console.log('🧹 GameScreen cleanup: Stopping polling and cleaning up subscriptions');
      const store = useGameStoreRealtime.getState();
      store.stopTurnPolling();
      store.stopGameStartPolling();
    };
  }, [gameId, myId, roomId, isServiceInitialized, storeGameId]);

  // Subscribe to game events when storeGameId becomes available (for room creators)
  useEffect(() => {
    if (storeGameId && isServiceInitialized && roomId) {
      console.log('🔔 storeGameId available, subscribing to game events:', storeGameId);
      subscribeToGame(storeGameId);
    }
  }, [storeGameId, isServiceInitialized, roomId, subscribeToGame]);

  // Update game phase based on current game state
  useEffect(() => {
    if (gameError) {
      setError(gameError);
      return;
    }

    if (!roomId) {
      console.log('⏳ Waiting for room data...');
      return;
    }

    console.log('🎮 Game state update:', { status, myShipsPlaced, opponentShipsPlaced, opponentId });
    
    // If in SETUP phase, show ship placement screen (even without opponent)
    if (status === GAME_STATUS.SETUP || status === GAME_STATUS.WAITING_FOR_OPPONENT) {
      if (!myShipsPlaced) {
        setGamePhase('setup');
      } else if (!opponentShipsPlaced) {
        setGamePhase('waiting_for_opponent');
        setOpponentReady(false);
      } else {
        setGamePhase('playing');
      }
    } else if (status === GAME_STATUS.WAITING) {
      // Only show waiting screen if explicitly in WAITING status (before setup starts)
      setGamePhase('waiting');
    } else if (status === GAME_STATUS.PLAYING) {
      setGamePhase('playing');
    } else if (status === GAME_STATUS.FINISHED) {
      setGamePhase('finished');
    }
  }, [roomId, status, gameError, myShipsPlaced, opponentShipsPlaced, opponentId]);

  // Handle ship placement completion
  const handlePlacementComplete = async (ships, board) => {
    try {
      console.log('Sending ship placement to server', ships, board);
      await placeShips(gameId, ships, board);
      setGamePhase('waiting_for_opponent');
    } catch (err) {
      console.error('Failed to place ships:', err);
      setError('Failed to place ships');
    }
  };

  // Handle cell click (attack)
  const handleCellClick = async (x, y) => {
    if (!isMyTurn) {
      console.log('Not your turn');
      return;
    }

    // Check if already attacking (using isAttacking from store)
    if (isAttacking) {
      console.log('Attack already in progress');
      return;
    }

    try {
      await makeMove(gameId, x, y);
    } catch (err) {
      console.error('Failed to make move:', err);
      // Don't set error state for turn/cell errors - just log them
      if (err.message === 'Not your turn' || err.message === 'Cell already attacked') {
        console.warn('Invalid move attempt:', err.message);
      } else {
        setError('Failed to make move');
      }
    }
  };

  // Leave game
  const handleLeaveGame = async () => {
    try {
      await leaveGameAction(gameId);
    } catch (err) {
      console.error('Failed to leave game:', err);
    }
    navigate('/lobby');
  };

  // Rematch
  const requestRematch = () => {
    navigate('/lobby');
  };

  // Render different phases
  const renderPhase = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="card max-w-md">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <button onClick={() => navigate('/lobby')} className="btn-primary w-full">
              Return to Lobby
            </button>
          </div>
        </div>
      );
    }

    if (isLoading && !roomId) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="card max-w-md text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Loading Game...
            </h2>
            <div className="flex space-x-2 justify-center">
              <div className="w-3 h-3 bg-ocean-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-ocean-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-3 h-3 bg-ocean-500 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      );
    }

    if (gamePhase === 'waiting') {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="card max-w-md text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Waiting for Opponent
            </h2>
            <p className="text-gray-400 mb-4">
              Waiting for another player to join...
            </p>
            <div className="flex space-x-2 justify-center mb-4">
              <div className="w-3 h-3 bg-ocean-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-ocean-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-3 h-3 bg-ocean-500 rounded-full animate-bounce delay-200"></div>
            </div>
            <button onClick={handleLeaveGame} className="btn-secondary w-full">
              Leave Game
            </button>
          </div>
        </div>
      );
    }

    if (gamePhase === 'setup') {
      return (
        <div className="min-h-screen bg-navy-900 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Place Your Ships
                </h1>
                <p className="text-gray-400">
                  Waiting for {opponentUsername || 'opponent'}...
                </p>
              </div>
              <button onClick={handleLeaveGame} className="btn-secondary">
                Leave Game
              </button>
            </div>

            {/* Ship Placement */}
            <ShipPlacementBoard onPlacementComplete={handlePlacementComplete} />
          </div>
        </div>
      );
    }

    if (gamePhase === 'waiting_for_opponent') {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="card max-w-md text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Ships Placed!
            </h2>
            <p className="text-gray-400 mb-4">
              Waiting for {opponentUsername} to place their ships...
            </p>
            <div className="flex space-x-2 justify-center">
              <div className="w-3 h-3 bg-ocean-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-ocean-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-3 h-3 bg-ocean-500 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      );
    }

    if (gamePhase === 'playing') {
      return (
        <div className="min-h-screen bg-navy-900 p-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-4 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">Battleship</h1>
              <button onClick={handleLeaveGame} className="btn-secondary text-sm">
                Forfeit
              </button>
            </div>

            {/* Turn Indicator */}
            <div className="mb-4">
              <TurnIndicator
                isMyTurn={isMyTurn}
                myUsername={myUsername}
                opponentUsername={opponentUsername}
                turnCount={turnCount}
              />
            </div>

            {/* Game Boards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* My Board */}
              <GameBoard
                board={myBoard}
                isMyBoard={true}
                isOpponentBoard={false}
                isMyTurn={false}
                title={`Your Board (${myUsername})`}
                onCellClick={() => {}}
                showShips={true}
              />

              {/* Opponent Board */}
              <GameBoard
                board={maskedOpponentBoard}
                isMyBoard={false}
                isOpponentBoard={true}
                isMyTurn={isMyTurn}
                title={`Opponent's Board (${opponentUsername})`}
                onCellClick={handleCellClick}
                showShips={false}
              />
            </div>

            {/* Status Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ShipStatus ships={myShipsWithHealth || []} title="Your Fleet" />
              <GameStatus
                moves={moves || []}
                lastMove={moves?.[moves.length - 1]}
                myId={myId}
              />
              <ShipStatus ships={opponentShipsWithHealth || []} title="Opponent's Fleet" />
            </div>

            {/* Chat Panel */}
            <ChatPanel roomId={roomId} gameId={storeGameId} />
          </div>
        </div>
      );
    }

    if (gamePhase === 'finished') {
      const isWinner = winner === myId;

      return (
        <GameFinishScreen
          isWinner={isWinner}
          myUsername={myUsername}
          opponentUsername={opponentUsername}
          myBoard={myBoard}
          opponentBoard={opponentBoard}
          myShips={myShipsWithHealth}
          opponentShips={opponentShipsWithHealth}
          onReturnToLobby={requestRematch}
        />
      );
    }

    return null;
  };

  return renderPhase();
};

export default GameScreen;
