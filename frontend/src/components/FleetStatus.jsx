import { useMemo } from 'react';
import { CELL_STATES } from '../utils/gameConstants';

const FleetStatus = ({ board, title, isMyBoard = false }) => {
  // Define ships for tournament mode (9 ships total)
  const TOURNAMENT_SHIPS = [
    { name: 'Battleship', size: 4, icon: '🚢', color: 'bg-orange-500' },
    { name: 'Cruiser', size: 3, icon: '⚓', color: 'bg-blue-500' },
    { name: 'Cruiser', size: 3, icon: '⚓', color: 'bg-blue-500' },
    { name: 'Destroyer', size: 2, icon: '🚤', color: 'bg-green-500' },
    { name: 'Destroyer', size: 2, icon: '🚤', color: 'bg-green-500' },
    { name: 'Submarine', size: 1, icon: '🤿', color: 'bg-purple-500' },
    { name: 'Submarine', size: 1, icon: '🤿', color: 'bg-purple-500' },
    { name: 'Submarine', size: 1, icon: '🤿', color: 'bg-purple-500' },
    { name: 'Submarine', size: 1, icon: '🤿', color: 'bg-purple-500' },
  ];

  // Calculate ship statuses by analyzing the board
  const { shipsStatus, totalHits, totalCells, shipsRemaining } = useMemo(() => {
    if (!board) {
      return { shipsStatus: [], totalHits: 0, totalCells: 0, shipsRemaining: 0 };
    }

    let hitCount = 0;
    let shipCellCount = 0;

    // Count hits and ship cells
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const cell = board[y][x];
        if (cell === CELL_STATES.SHIP) {
          shipCellCount++;
        } else if (cell === CELL_STATES.HIT) {
          hitCount++;
          shipCellCount++; // Hit cells were ship cells
        }
      }
    }

    // Calculate estimated ship status
    // For opponent board, we can only show hits (we don't know unhit ship cells)
    // For my board, we can show full status
    const statuses = TOURNAMENT_SHIPS.map((ship, index) => {
      // We can't determine exact ship status without tracking placement
      // So we'll show a simplified version
      const estimatedHits = Math.min(
        Math.floor(hitCount / TOURNAMENT_SHIPS.length), 
        ship.size
      );
      
      return {
        ...ship,
        id: `${ship.name}-${index}`,
        hits: isMyBoard ? estimatedHits : 0, // Only show for my board
        sunk: false, // We'll implement ship tracking later
      };
    });

    const totalShipCells = TOURNAMENT_SHIPS.reduce((sum, ship) => sum + ship.size, 0);
    const remaining = TOURNAMENT_SHIPS.filter(s => !s.sunk).length;

    return {
      shipsStatus: statuses,
      totalHits: hitCount,
      totalCells: totalShipCells,
      shipsRemaining: remaining,
    };
  }, [board, isMyBoard]);

  const healthPercentage = totalCells > 0 ? ((totalCells - totalHits) / totalCells) * 100 : 100;

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-lg p-4 w-full">
      <h3 className="text-sm font-bold text-white mb-3">{title}</h3>
      
      {/* Overall Health Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Fleet Health</span>
          <span>{totalCells - totalHits} / {totalCells}</span>
        </div>
        <div className="w-full bg-navy-900 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              healthPercentage > 66
                ? 'bg-green-500'
                : healthPercentage > 33
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${healthPercentage}%` }}
          ></div>
        </div>
        <div className="text-xs text-center mt-1 text-gray-400">
          {Math.round(healthPercentage)}%
        </div>
      </div>

      {/* Ships List */}
      <div className="space-y-2">
        {TOURNAMENT_SHIPS.map((ship, index) => {
          const key = `${ship.name}-${index}`;
          const shipHits = isMyBoard 
            ? (() => {
                // For my board, count hits on this specific ship size
                // This is a simplified calculation
                return 0; // Will be enhanced with proper ship tracking
              })()
            : 0;
          
          const isSunk = shipHits >= ship.size;
          const healthPct = ((ship.size - shipHits) / ship.size) * 100;

          return (
            <div
              key={key}
              className={`flex items-center space-x-2 p-2 rounded ${
                isSunk ? 'bg-red-900/30 opacity-60' : 'bg-navy-900/50'
              }`}
            >
              <div className="text-lg">{ship.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-semibold ${isSunk ? 'line-through text-gray-500' : 'text-white'}`}>
                    {ship.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {ship.size} {ship.size === 1 ? 'cell' : 'cells'}
                  </span>
                </div>
                
                {/* Health bar for each ship */}
                {isMyBoard && (
                  <div className="w-full bg-navy-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isSunk ? 'bg-red-600' : ship.color
                      }`}
                      style={{ width: `${healthPct}%` }}
                    ></div>
                  </div>
                )}
                
                {isSunk && (
                  <div className="text-xs text-red-400 mt-1">💀 Sunk</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-navy-700">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Ships Remaining:</span>
          <span className="text-white font-bold">{shipsRemaining} / {TOURNAMENT_SHIPS.length}</span>
        </div>
        {isMyBoard && (
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-400">Total Hits Taken:</span>
            <span className="text-red-400 font-bold">{totalHits}</span>
          </div>
        )}
        {!isMyBoard && (
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-400">Hits Delivered:</span>
            <span className="text-green-400 font-bold">{totalHits}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetStatus;
