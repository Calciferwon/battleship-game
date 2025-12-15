const ShipStatus = ({ ships, title = 'Fleet Status', hideUnsunk = false }) => {
  const getHealthPercentage = (ship) => {
    if (!ship.hits || ship.hits.length === 0) return 100;
    return ((ship.size - ship.hits.length) / ship.size) * 100;
  };

  const getHealthColor = (percentage) => {
    if (percentage > 66) return 'bg-green-500';
    if (percentage > 33) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getShipIcon = (ship) => {
    // Show different emojis based on ship type and status
    if (ship.sunk) return '💀';
    if (ship.hits && ship.hits.length > 0) return '🔥';
    
    // Different emojis for different ship types
    switch(ship.id) {
      case 'carrier': return '�️';
      case 'battleship': return '⚓';
      case 'cruiser': return '�🚢';
      case 'submarine': return '🔱';
      case 'destroyer': return '🛥️';
      default: return '🚢';
    }
  };

  // Filter ships if hideUnsunk is true (only show sunk ships for opponent)
  const displayShips = hideUnsunk ? ships.filter(ship => ship.sunk) : ships;

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>

      {displayShips.length === 0 && hideUnsunk && (
        <p className="text-gray-400 text-center py-4">
          No ships sunk yet
        </p>
      )}

      <div className="space-y-3">
        {displayShips.map((ship) => {
          const healthPercentage = getHealthPercentage(ship);
          const isDestroyed = ship.sunk;

          return (
            <div
              key={ship.id}
              className={`p-3 rounded-lg ${
                isDestroyed ? 'bg-red-900/20' : 'bg-navy-700'
              }`}
            >
              {/* Ship Name & Icon */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{getShipIcon(ship)}</span>
                  <span
                    className={`font-semibold ${
                      isDestroyed ? 'text-red-400 line-through' : 'text-white'
                    }`}
                  >
                    {ship.name}
                  </span>
                  <span className="text-xs text-gray-400">({ship.size} cells)</span>
                </div>

                {/* Status Badge */}
                {isDestroyed ? (
                  <span className="text-xs px-2 py-1 rounded bg-red-600 text-white font-semibold">
                    SUNK
                  </span>
                ) : ship.hits && ship.hits.length > 0 ? (
                  <span className="text-xs px-2 py-1 rounded bg-yellow-600 text-white font-semibold">
                    HIT
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-green-600 text-white font-semibold">
                    OK
                  </span>
                )}
              </div>

              {/* Health Bar */}
              <div className="w-full h-2 bg-navy-600 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getHealthColor(healthPercentage)}`}
                  style={{ width: `${healthPercentage}%` }}
                ></div>
              </div>

              {/* Hit Counter */}
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>
                  {ship.hits ? ship.hits.length : 0} / {ship.size} hits
                </span>
                <span>{Math.round(healthPercentage)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {!hideUnsunk && (
        <div className="mt-4 pt-4 border-t border-navy-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Ships Remaining:</span>
            <span className="text-white font-semibold">
              {ships.filter((s) => !s.sunk).length} / {ships.length}
            </span>
          </div>
        </div>
      )}
      
      {/* Summary for enemy ships destroyed */}
      {hideUnsunk && (
        <div className="mt-4 pt-4 border-t border-navy-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Ships Destroyed:</span>
            <span className="text-white font-semibold">
              {ships.filter((s) => s.sunk).length} / {ships.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipStatus;
