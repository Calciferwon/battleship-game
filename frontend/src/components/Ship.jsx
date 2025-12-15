import { ORIENTATIONS } from '../utils/gameConstants';

const Ship = ({
  ship,
  isPlaced = false,
  isDragging = false,
  onDragStart,
  onRotate,
}) => {
  const { name, size, color, orientation, sunk, id } = ship;

  const getShipIcon = () => {
    switch(id) {
      case 'carrier': return '🛳️';
      case 'battleship': return '⚓';
      case 'cruiser': return '🚢';
      case 'submarine': return '🔱';
      case 'destroyer': return '🛥️';
      default: return '🚢';
    }
  };

  const getShipClasses = () => {
    const baseClasses = 'flex gap-1 p-2 rounded-lg border-2 transition-all duration-200';

    if (sunk) {
      return `${baseClasses} bg-red-900 border-red-700 opacity-50`;
    }

    if (isPlaced) {
      return `${baseClasses} bg-navy-700 border-navy-600 opacity-60`;
    }

    if (isDragging) {
      return `${baseClasses} bg-navy-600 border-ocean-500 opacity-75 cursor-grabbing`;
    }

    return `${baseClasses} bg-navy-700 border-navy-600 hover:border-ocean-500 cursor-grab`;
  };

  const renderShipCells = () => {
    const cells = [];
    for (let i = 0; i < size; i++) {
      cells.push(
        <div
          key={i}
          className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-xs"
          style={{ backgroundColor: color }}
        >
          {sunk && '✕'}
        </div>
      );
    }
    return cells;
  };

  return (
    <div
      className={getShipClasses()}
      draggable={!isPlaced && !sunk}
      onDragStart={onDragStart}
      style={{
        flexDirection: orientation === ORIENTATIONS.HORIZONTAL ? 'row' : 'column',
        cursor: isPlaced || sunk ? 'not-allowed' : 'grab',
      }}
    >
      {/* Ship Info */}
      <div className="flex items-center justify-between w-full mb-1">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getShipIcon()}</span>
          <span className="text-sm font-semibold text-white">{name}</span>
        </div>
        {!isPlaced && !sunk && onRotate && (
          <button
            onClick={onRotate}
            className="text-ocean-400 hover:text-ocean-300 text-xs px-2 py-1 rounded bg-navy-600"
            title="Rotate ship (R key)"
          >
            ↻
          </button>
        )}
      </div>

      {/* Ship Cells */}
      <div
        className="flex gap-1"
        style={{
          flexDirection: orientation === ORIENTATIONS.HORIZONTAL ? 'row' : 'column',
        }}
      >
        {renderShipCells()}
      </div>

      {/* Status */}
      {sunk && (
        <div className="text-xs text-red-400 font-semibold mt-1">SUNK</div>
      )}
      {isPlaced && !sunk && (
        <div className="text-xs text-green-400 font-semibold mt-1">PLACED</div>
      )}
    </div>
  );
};

export default Ship;
