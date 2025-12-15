import { SHIPS } from '../utils/gameConstants';

const GameStatus = ({ moves, lastMove, myId, onRematch }) => {
  const getRecentMoves = () => {
    return moves.slice(-5).reverse();
  };

  const getMoveIcon = (result) => {
    if (result === 'hit') return '🎯';
    if (result === 'miss') return '💨';
    if (result === 'sunk') return '💥';
    return '•';
  };

  const getMoveColor = (result) => {
    if (result === 'hit' || result === 'sunk') return 'text-red-400';
    return 'text-gray-400';
  };

  const getShipName = (shipId) => {
    const ship = SHIPS.find((s) => s.id === shipId);
    return ship ? ship.name : shipId;
  };

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-white mb-4">Game Log</h3>

      {moves.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No moves yet</p>
          <p className="text-sm mt-1">Game will start soon...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {getRecentMoves().map((move, index) => {
            const isMyMove = move.playerId === myId;
            const coord = String.fromCharCode(65 + move.position.x) + (move.position.y + 1);

            return (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  index === 0 && move === lastMove
                    ? 'bg-ocean-900 border border-ocean-500'
                    : 'bg-navy-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getMoveIcon(move.result)}</span>
                  <div>
                    <p className={`font-semibold ${getMoveColor(move.result)}`}>
                      {isMyMove ? 'You' : 'Opponent'} attacked {coord}
                    </p>
                    {move.result === 'hit' && !move.shipSunk && (
                      <p className="text-xs text-gray-400">Hit!</p>
                    )}
                    {move.result === 'miss' && (
                      <p className="text-xs text-gray-400">Miss!</p>
                    )}
                    {move.shipSunk && (
                      <p className="text-xs text-yellow-400">
                        {getShipName(move.shipSunk)} sunk!
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-xs text-gray-500">
                  {new Date(move.timestamp).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Show more indicator */}
      {moves.length > 5 && (
        <div className="text-center mt-3 text-sm text-gray-500">
          +{moves.length - 5} more moves
        </div>
      )}

      {/* Rematch button (shown after game ends) */}
      {onRematch && (
        <button onClick={onRematch} className="btn-primary w-full mt-4">
          ⚔️ Request Rematch
        </button>
      )}
    </div>
  );
};

export default GameStatus;
