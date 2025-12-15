import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAIGameStore from '../stores/aiGameStore';
import GameBoard from './GameBoard';
import ShipPlacementBoard from './ShipPlacementBoard';
import ShipStatus from './ShipStatus';
import TurnIndicator from './TurnIndicator';
import { GAME_STATUS } from '../utils/gameConstants';
import { areAllShipsPlaced } from '../utils/gameHelpers';

const AIGameScreen = () => {
  const navigate = useNavigate();
  const {
    status,
    difficulty,
    myUsername,
    opponentUsername,
    myBoard,
    opponentBoard,
    myShips,
    opponentShips,
    isMyTurn,
    turnCount,
    turnTimeRemaining,
    winner,
    winReason,
    lastMove,
    aiThinking,
    error,
    startNewGame,
    startPlaying,
    randomPlaceShips,
    attackCell,
    resetGame,
    setDifficulty,
    stopTurnTimer,
  } = useAIGameStore();

  const [setupShips, setSetupShips] = useState([]);
  const [setupBoard, setSetupBoard] = useState([]);
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);

  // Initialize game on mount
  useEffect(() => {
    startNewGame(difficulty, myUsername);
    
    // Cleanup timer on unmount
    return () => {
      stopTurnTimer();
    };
  }, []);

  const handleShipPlacement = (ships, board) => {
    setSetupShips(ships);
    setSetupBoard(board);
    // Automatically start the game when placement is confirmed
    startPlaying(ships, board);
  };

  const handleRandomPlacement = () => {
    randomPlaceShips();
  };

  const handleAttack = (x, y) => {
    if (status === GAME_STATUS.PLAYING && isMyTurn && !aiThinking) {
      attackCell(x, y);
    }
  };

  const handleNewGame = () => {
    resetGame();
  };

  const handleChangeDifficulty = (newDifficulty) => {
    setDifficulty(newDifficulty);
    setShowDifficultySelect(false);
    startNewGame(newDifficulty, myUsername);
  };

  const handleBackToLobby = () => {
    navigate('/lobby');
  };

  return (
    <div className="min-h-screen bg-navy-900 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToLobby}
              className="btn-secondary"
            >
              ← Back to Lobby
            </button>
            <h1 className="text-3xl font-bold text-white">
              🤖 Play vs AI
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {status !== GAME_STATUS.FINISHED && (
              <button
                onClick={() => setShowDifficultySelect(!showDifficultySelect)}
                className="btn-secondary"
              >
                Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </button>
            )}
            {status === GAME_STATUS.PLAYING && (
              <button
                onClick={handleNewGame}
                className="btn-secondary"
              >
                New Game
              </button>
            )}
          </div>
        </div>

        {/* Difficulty Selector */}
        {showDifficultySelect && (
          <div className="bg-navy-800 rounded-lg p-4 mb-4">
            <p className="text-white mb-3 font-semibold">Select Difficulty:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => handleChangeDifficulty('easy')}
                className={`px-4 py-3 rounded-lg transition-all ${
                  difficulty === 'easy'
                    ? 'bg-green-600 text-white shadow-lg scale-105'
                    : 'bg-navy-700 text-gray-300 hover:bg-navy-600'
                }`}
              >
                <div className="text-2xl mb-1">😊</div>
                <div className="font-bold">Easy</div>
              </button>
              <button
                onClick={() => handleChangeDifficulty('medium')}
                className={`px-4 py-3 rounded-lg transition-all ${
                  difficulty === 'medium'
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-navy-700 text-gray-300 hover:bg-navy-600'
                }`}
              >
                <div className="text-2xl mb-1">🎯</div>
                <div className="font-bold">Medium</div>
              </button>
              <button
                onClick={() => handleChangeDifficulty('hard')}
                className={`px-4 py-3 rounded-lg transition-all ${
                  difficulty === 'hard'
                    ? 'bg-orange-600 text-white shadow-lg scale-105'
                    : 'bg-navy-700 text-gray-300 hover:bg-navy-600'
                }`}
              >
                <div className="text-2xl mb-1">💀</div>
                <div className="font-bold">Hard</div>
              </button>
              <button
                onClick={() => handleChangeDifficulty('expert')}
                className={`px-4 py-3 rounded-lg transition-all ${
                  difficulty === 'expert'
                    ? 'bg-red-600 text-white shadow-lg scale-105'
                    : 'bg-navy-700 text-gray-300 hover:bg-navy-600'
                }`}
              >
                <div className="text-2xl mb-1">�</div>
                <div className="font-bold">Expert</div>
              </button>
            </div>
            <div className="mt-4 p-3 bg-navy-900 rounded-lg text-sm text-gray-300">
              {difficulty === 'easy' && (
                <div>
                  <div className="font-bold text-green-400 mb-1">😊 Easy Mode</div>
                  <div>• Random targeting with basic logic</div>
                  <div>• Sometimes avoids obvious mistakes</div>
                  <div>• Great for beginners!</div>
                </div>
              )}
              {difficulty === 'medium' && (
                <div>
                  <div className="font-bold text-blue-400 mb-1">🎯 Medium Mode</div>
                  <div>• Uses checkerboard hunting pattern</div>
                  <div>• Smart adjacent targeting after hits</div>
                  <div>• Learns ship orientation from hits</div>
                </div>
              )}
              {difficulty === 'hard' && (
                <div>
                  <div className="font-bold text-orange-400 mb-1">💀 Hard Mode</div>
                  <div>• Probability-based targeting</div>
                  <div>• Ship size awareness</div>
                  <div>• Density analysis for optimal placement</div>
                </div>
              )}
              {difficulty === 'expert' && (
                <div>
                  <div className="font-bold text-red-400 mb-1">🔥 Expert Mode</div>
                  <div>• Advanced probability calculations</div>
                  <div>• Parity optimization</div>
                  <div>• Pattern completion and predictive targeting</div>
                  <div className="text-yellow-400 mt-1">⚠️ Warning: Very challenging!</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Turn Indicator */}
        {status === GAME_STATUS.PLAYING && (
          <TurnIndicator
            isMyTurn={isMyTurn}
            currentPlayer={isMyTurn ? myUsername : opponentUsername}
            turnCount={turnCount}
          />
        )}

        {/* AI Thinking Indicator */}
        {aiThinking && (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-4">
            <p className="text-yellow-400 text-center">
              🤔 AI is thinking...
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Last Move */}
        {lastMove && status === GAME_STATUS.PLAYING && (
          <div className="bg-navy-800 rounded-lg p-3 mb-4">
            <p className="text-white text-center">
              {lastMove.player === 'player' ? '🎯 You' : '🤖 AI'}{' '}
              {lastMove.result === 'hit' ? 'HIT' : 'MISSED'} at{' '}
              {String.fromCharCode(65 + lastMove.x)}{lastMove.y + 1}
              {lastMove.sunkShip && (
                <span className="text-red-400 font-bold ml-2">
                  💥 {lastMove.sunkShip.name} SUNK!
                </span>
              )}
            </p>
          </div>
        )}

        {/* Game Over */}
        {status === GAME_STATUS.FINISHED && (
          <div className={`rounded-lg p-6 mb-4 text-center ${
            winner === 'player'
              ? 'bg-green-900/30 border border-green-600'
              : 'bg-red-900/30 border border-red-600'
          }`}>
            <h2 className={`text-3xl font-bold mb-2 ${
              winner === 'player' ? 'text-green-400' : 'text-red-400'
            }`}>
              {winner === 'player' ? '🎉 Victory!' : '💔 Defeat'}
            </h2>
            <p className="text-white text-lg mb-4">{winReason}</p>
            <p className="text-gray-400 mb-4">Game lasted {turnCount} turns</p>
            <div className="flex justify-center space-x-4">
              <button onClick={handleNewGame} className="btn-primary">
                Play Again
              </button>
              <button onClick={handleBackToLobby} className="btn-secondary">
                Back to Lobby
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Setup Phase */}
      {status === GAME_STATUS.SETUP && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-navy-800 rounded-lg p-6 mb-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              🚢 Place Your Ships
            </h2>
            <p className="text-gray-400 mb-4">
              Drag ships onto the board, use random placement, then confirm to start the battle!
            </p>
          </div>

          <ShipPlacementBoard
            onPlacementComplete={handleShipPlacement}
            initialShips={myShips}
            initialBoard={myBoard}
          />
        </div>
      )}

      {/* Playing Phase */}
      {status === GAME_STATUS.PLAYING && (
        <div className="max-w-7xl mx-auto">
          {/* Main Game Area - Single Row Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left Column: Your Board */}
            <div className="bg-navy-800 rounded-lg p-4">
              <h3 className="text-xl font-bold text-white mb-4">
                🛡️ Your Board
              </h3>
              <p className="text-sm text-gray-400 mb-3">Defend your waters</p>
              
              {/* Your Board */}
              <div className="flex justify-center mb-4">
                <div className="scale-90 origin-top">
                  <GameBoard
                    board={myBoard}
                    ships={myShips}
                    isMyBoard={true}
                    isOpponentBoard={false}
                    onCellClick={() => {}}
                    showShips={true}
                    title=""
                  />
                </div>
              </div>

              {/* Your Fleet Status */}
              <div className="mt-4">
                <h4 className="text-lg font-bold text-white mb-3">Your Fleet</h4>
                <ShipStatus ships={myShips} />
              </div>
            </div>

            {/* Center Column: Enemy Board - Main Focus */}
            <div className="lg:col-span-2 bg-navy-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    🎯 Enemy Fleet
                  </h3>
                  <p className="text-sm text-gray-400">Target their ships</p>
                </div>
                
                {/* Turn Timer and Counter */}
                <div className="flex items-center space-x-6">
                  {isMyTurn && !aiThinking && (
                    <div className="text-center bg-navy-900 rounded-lg px-4 py-2 border-2 border-green-500">
                      <div className={`text-3xl font-bold ${
                        turnTimeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-green-400'
                      }`}>
                        {turnTimeRemaining}s
                      </div>
                      <div className="text-xs text-gray-400">Time Left</div>
                    </div>
                  )}
                  
                  <div className="text-center bg-navy-900 rounded-lg px-4 py-2">
                    <div className="text-2xl font-bold text-blue-400">
                      {turnCount}
                    </div>
                    <div className="text-xs text-gray-400">Turn</div>
                  </div>
                </div>
              </div>
              
              {/* Enemy Board - Large and Centered */}
              <div className="flex justify-center">
                <GameBoard
                  board={opponentBoard}
                  ships={opponentShips}
                  isMyBoard={false}
                  isOpponentBoard={true}
                  isMyTurn={isMyTurn && !aiThinking}
                  onCellClick={handleAttack}
                  showShips={false}
                  disabled={!isMyTurn || aiThinking}
                  title=""
                />
              </div>
              
              {/* Enemy Fleet Status - Compact */}
              <div className="mt-4">
                <ShipStatus ships={opponentShips} hideUnsunk={true} title="Enemy Ships Destroyed" />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Finished Phase - Show both boards */}
      {status === GAME_STATUS.FINISHED && (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Player Board */}
            <div>
              <div className="bg-navy-800 rounded-lg p-4 mb-4">
                <h3 className="text-xl font-bold text-white mb-2">
                  Your Fleet
                </h3>
                <ShipStatus ships={myShips} />
              </div>
              <div className="bg-navy-800 rounded-lg p-4">
                <h3 className="text-xl font-bold text-white mb-4">
                  Your Board
                </h3>
                <GameBoard
                  board={myBoard}
                  ships={myShips}
                  isMyBoard={true}
                  onCellClick={() => {}}
                  showShips={true}
                />
              </div>
            </div>

            {/* Opponent Board */}
            <div>
              <div className="bg-navy-800 rounded-lg p-4 mb-4">
                <h3 className="text-xl font-bold text-white mb-2">
                  Enemy Fleet
                </h3>
                <ShipStatus ships={opponentShips} />
              </div>
              <div className="bg-navy-800 rounded-lg p-4">
                <h3 className="text-xl font-bold text-white mb-4">
                  Enemy Board (Revealed)
                </h3>
                <GameBoard
                  board={opponentBoard}
                  ships={opponentShips}
                  isMyBoard={false}
                  onCellClick={() => {}}
                  showShips={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIGameScreen;
