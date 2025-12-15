import GameBoard from './GameBoard';
import { CELL_STATES } from '../utils/gameConstants';

const GameFinishScreen = ({
  isWinner,
  myUsername,
  opponentUsername,
  myBoard,
  opponentBoard,
  myShips = [],
  opponentShips = [],
  onReturnToLobby,
}) => {
  // Calculate ship statistics
  const calculateShipStats = (ships) => {
    if (!ships || ships.length === 0) {
      return { operational: 0, destroyed: 0 };
    }
    
    const operational = ships.filter(ship => !ship.sunk).length;
    const destroyed = ships.filter(ship => ship.sunk).length;
    
    return { operational, destroyed };
  };

  const myStats = calculateShipStats(myShips);
  const opponentStats = calculateShipStats(opponentShips);

  // Create a version of opponent board that shows all ships
  const getRevealedOpponentBoard = () => {
    if (!opponentBoard) return opponentBoard;
    
    // This board already has hits/misses, we just need to show remaining ships
    return opponentBoard.map(row =>
      row.map(cell => {
        // Keep hits and misses as is, but reveal hidden ships
        if (cell === CELL_STATES.SHIP || cell === CELL_STATES.EMPTY) {
          return cell; // Ships are already visible in the actual board data
        }
        return cell;
      })
    );
  };

  const revealedOpponentBoard = getRevealedOpponentBoard();

  return (
    <div className="min-h-screen bg-navy-900 p-4 overflow-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl font-bold text-white mb-4">BATTLESHIP</h1>
          <div className="text-6xl mb-4">{isWinner ? '🏆' : '💀'}</div>
          <h2 className="text-4xl font-bold mb-2" style={{ color: isWinner ? '#fbbf24' : '#ef4444' }}>
            {isWinner ? 'VICTORY!' : 'DEFEAT'}
          </h2>
          <p className="text-xl text-gray-300 mb-2">Battle Complete</p>
          <p className="text-lg text-gray-400">
            {isWinner
              ? `Outstanding Admiral! Enemy fleet destroyed!`
              : `${opponentUsername} has sunk all your ships!`}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <button onClick={onReturnToLobby} className="btn-primary px-8 py-3 text-lg">
            New Game
          </button>
          <button className="btn-secondary px-8 py-3 text-lg">
            Rules
          </button>
          <button className="btn-secondary px-8 py-3 text-lg">
            Difficulty
          </button>
        </div>

        {/* Boards Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Your Fleet */}
          <div className="animate-fade-in">
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-ocean-400 text-center mb-2">Your Fleet</h3>
              <p className="text-center text-gray-400">Defend your waters</p>
            </div>
            
            <div className="flex justify-center mb-4">
              <GameBoard
                board={myBoard}
                ships={myShips}
                isMyBoard={true}
                isOpponentBoard={false}
                isMyTurn={false}
                title=""
                onCellClick={() => {}}
                showShips={true}
                disabled={true}
              />
            </div>

            {/* My Fleet Stats */}
            <div className="bg-navy-800 border-2 border-navy-700 rounded-lg p-4 max-w-sm mx-auto">
              <div className="flex items-center justify-center mb-3">
                <div className="text-4xl mr-3">⚓</div>
                <div>
                  <div className="text-3xl font-bold text-ocean-400">{myStats.operational}</div>
                  <div className="text-sm text-gray-400">ships operational</div>
                </div>
              </div>
              <div className="border-t border-navy-600 pt-2 text-center text-sm text-gray-400">
                Battle concluded
              </div>
            </div>
          </div>

          {/* Enemy Fleet */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-red-400 text-center mb-2">Enemy Fleet</h3>
              <p className="text-center text-gray-400">Target their ships</p>
            </div>
            
            <div className="flex justify-center mb-4">
              <GameBoard
                board={revealedOpponentBoard}
                ships={opponentShips}
                isMyBoard={false}
                isOpponentBoard={false}
                isMyTurn={false}
                title=""
                onCellClick={() => {}}
                showShips={true}
                disabled={true}
              />
            </div>

            {/* Enemy Fleet Stats */}
            <div className="bg-red-900/20 border-2 border-red-800 rounded-lg p-4 max-w-sm mx-auto">
              <div className="flex items-center justify-center mb-3">
                <div className="text-4xl mr-3">🎯</div>
                <div>
                  <div className="text-3xl font-bold text-red-400">{opponentStats.destroyed}</div>
                  <div className="text-sm text-gray-400">ships remaining</div>
                </div>
              </div>
              <div className="border-t border-red-800 pt-2 text-center text-sm text-gray-400">
                Battle concluded
              </div>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
          {/* Your Fleet Card */}
          <div className={`rounded-lg p-6 border-2 ${isWinner ? 'bg-ocean-900/30 border-ocean-600' : 'bg-navy-800 border-navy-700'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="text-3xl mr-3">⚓</div>
                <div>
                  <div className="text-lg font-bold text-white">{myUsername || 'Your Fleet'}</div>
                  <div className="text-sm text-gray-400">{myStats.operational} ships operational</div>
                </div>
              </div>
              <div className="text-4xl font-bold text-ocean-400">{myStats.operational}</div>
            </div>
            <div className="flex items-center text-sm text-gray-400">
              <span className="text-red-400 font-semibold mr-2">{myStats.destroyed}</span>
              ships destroyed
            </div>
          </div>

          {/* Enemy Fleet Card */}
          <div className={`rounded-lg p-6 border-2 ${!isWinner ? 'bg-red-900/20 border-red-700' : 'bg-navy-800 border-navy-700'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="text-3xl mr-3">🎯</div>
                <div>
                  <div className="text-lg font-bold text-white">{opponentUsername || 'Enemy Fleet'}</div>
                  <div className="text-sm text-gray-400">{opponentStats.destroyed} ships remaining</div>
                </div>
              </div>
              <div className="text-4xl font-bold text-red-400">{opponentStats.destroyed}</div>
            </div>
            <div className="flex items-center text-sm text-gray-400">
              <span className="text-ocean-400 font-semibold mr-2">{opponentStats.operational}</span>
              ships survived
            </div>
          </div>
        </div>

        {/* AI Difficulty Badge (if applicable) */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center bg-yellow-900/30 border border-yellow-700 rounded-full px-4 py-2">
            <span className="text-yellow-500 mr-2">⚔️</span>
            <span className="text-yellow-300 text-sm font-semibold">AI Difficulty: Trung Bình</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameFinishScreen;
