import { useState, useEffect } from 'react';
import Ship from './Ship';
import GridCell from './GridCell';
import {
  BOARD_SIZE,
  COLUMN_LABELS,
  ROW_LABELS,
  CELL_STATES,
  ORIENTATIONS,
  createEmptyBoard,
  createEmptyShips,
} from '../utils/gameConstants';
import {
  isValidPlacement,
  placeShipOnBoard,
  removeShipFromBoard,
  generateRandomPlacement,
  areAllShipsPlaced,
} from '../utils/gameHelpers';

const ShipPlacementBoard = ({ onPlacementComplete }) => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [ships, setShips] = useState(createEmptyShips());
  const [draggedShip, setDraggedShip] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [previewCells, setPreviewCells] = useState([]);

  // Check if all ships are placed
  const allShipsPlaced = areAllShipsPlaced(ships);

  // Handle ship rotation
  const rotateShip = (shipId) => {
    setShips((prev) =>
      prev.map((ship) => {
        if (ship.id === shipId && !ship.position) {
          return {
            ...ship,
            orientation:
              ship.orientation === ORIENTATIONS.HORIZONTAL
                ? ORIENTATIONS.VERTICAL
                : ORIENTATIONS.HORIZONTAL,
          };
        }
        return ship;
      })
    );
  };

  // Handle drag start
  const handleDragStart = (ship) => (e) => {
    setDraggedShip(ship);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over cell
  const handleDragOver = (x, y) => (e) => {
    e.preventDefault();

    if (!draggedShip) return;

    setHoveredCell({ x, y });

    // Calculate preview cells
    const cells = [];
    const valid = isValidPlacement(board, draggedShip, { x, y }, draggedShip.orientation);

    for (let i = 0; i < draggedShip.size; i++) {
      const cellX = draggedShip.orientation === ORIENTATIONS.HORIZONTAL ? x + i : x;
      const cellY = draggedShip.orientation === ORIENTATIONS.VERTICAL ? y + i : y;

      if (cellX < BOARD_SIZE && cellY < BOARD_SIZE) {
        cells.push({ x: cellX, y: cellY, valid });
      }
    }

    setPreviewCells(cells);
  };

  // Handle drop on cell
  const handleDrop = (x, y) => (e) => {
    e.preventDefault();

    if (!draggedShip) return;

    const valid = isValidPlacement(board, draggedShip, { x, y }, draggedShip.orientation);

    if (valid) {
      // Place ship
      const newBoard = placeShipOnBoard(board, draggedShip, { x, y }, draggedShip.orientation);
      setBoard(newBoard);

      // Update ship position
      setShips((prev) =>
        prev.map((ship) => {
          if (ship.id === draggedShip.id) {
            return {
              ...ship,
              position: { x, y },
            };
          }
          return ship;
        })
      );
    }

    setDraggedShip(null);
    setHoveredCell(null);
    setPreviewCells([]);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setHoveredCell(null);
    setPreviewCells([]);
  };

  // Handle ship removal (double-click on placed ship cell)
  const handleCellDoubleClick = (x, y) => {
    const placedShip = ships.find((ship) => {
      if (!ship.position) return false;

      const { size, orientation } = ship;
      const { x: shipX, y: shipY } = ship.position;

      for (let i = 0; i < size; i++) {
        const checkX = orientation === ORIENTATIONS.HORIZONTAL ? shipX + i : shipX;
        const checkY = orientation === ORIENTATIONS.VERTICAL ? shipY + i : shipY;

        if (checkX === x && checkY === y) {
          return true;
        }
      }
      return false;
    });

    if (placedShip) {
      // Remove ship from board
      const newBoard = removeShipFromBoard(board, placedShip);
      setBoard(newBoard);

      // Reset ship position
      setShips((prev) =>
        prev.map((ship) => {
          if (ship.id === placedShip.id) {
            return {
              ...ship,
              position: null,
            };
          }
          return ship;
        })
      );
    }
  };

  // Handle random placement
  const handleRandomPlacement = () => {
    const { ships: newShips, board: newBoard } = generateRandomPlacement(ships);
    setShips(newShips);
    setBoard(newBoard);
  };

  // Handle reset
  const handleReset = () => {
    setBoard(createEmptyBoard());
    setShips(createEmptyShips());
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (draggedShip && !draggedShip.position) {
          rotateShip(draggedShip.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [draggedShip]);

  // Get cell state with preview
  const getCellState = (x, y) => {
    const baseState = board[y][x];

    // Show preview
    const previewCell = previewCells.find((cell) => cell.x === x && cell.y === y);
    if (previewCell) {
      return previewCell.valid ? 'preview-valid' : 'preview-invalid';
    }

    return baseState;
  };

  const getCellClasses = (x, y) => {
    const cellState = getCellState(x, y);
    const baseClasses = 'w-10 h-10 border transition-all duration-200';

    if (cellState === 'preview-valid') {
      return `${baseClasses} bg-green-500 border-green-400 opacity-50`;
    } else if (cellState === 'preview-invalid') {
      return `${baseClasses} bg-red-500 border-red-400 opacity-50`;
    } else if (cellState === CELL_STATES.SHIP) {
      return `${baseClasses} bg-navy-600 border-navy-500`;
    } else {
      return `${baseClasses} bg-ocean-900 border-ocean-700`;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Board */}
      <div className="flex flex-col">
        <h3 className="text-lg font-bold text-white mb-2">Place Your Ships</h3>

        <div className="inline-flex flex-col bg-navy-800 p-4 rounded-lg border-2 border-navy-700">
          {/* Column Labels */}
          <div className="flex mb-1">
            <div className="w-6"></div>
            {COLUMN_LABELS.map((label) => (
              <div
                key={label}
                className="w-10 h-6 flex items-center justify-center text-ocean-400 text-sm font-bold"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          {board.map((row, y) => (
            <div key={y} className="flex">
              <div className="w-6 h-10 flex items-center justify-center text-ocean-400 text-sm font-bold">
                {ROW_LABELS[y]}
              </div>

              {row.map((_, x) => (
                <div
                  key={`${x}-${y}`}
                  className={getCellClasses(x, y)}
                  onDragOver={handleDragOver(x, y)}
                  onDrop={handleDrop(x, y)}
                  onDragLeave={handleDragLeave}
                  onDoubleClick={() => handleCellDoubleClick(x, y)}
                  style={{ cursor: board[y][x] === CELL_STATES.SHIP ? 'pointer' : 'default' }}
                  title={board[y][x] === CELL_STATES.SHIP ? 'Double-click to remove ship' : ''}
                />
              ))}
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-400 mt-2">
          💡 Drag ships onto the board or double-click to remove
        </p>
      </div>

      {/* Ships Panel */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Your Fleet</h3>
          <div className="space-y-3">
            {ships.map((ship) => (
              <Ship
                key={ship.id}
                ship={ship}
                isPlaced={ship.position !== null}
                isDragging={draggedShip?.id === ship.id}
                onDragStart={handleDragStart(ship)}
                onRotate={() => rotateShip(ship.id)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button onClick={handleRandomPlacement} className="btn-secondary w-full">
            🎲 Random Placement
          </button>
          <button onClick={handleReset} className="btn-secondary w-full">
            🔄 Reset
          </button>
          <button
            onClick={() => onPlacementComplete && onPlacementComplete(ships, board)}
            disabled={!allShipsPlaced}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allShipsPlaced ? '✓ Confirm Placement' : '⏳ Place All Ships'}
          </button>
        </div>

        {/* Instructions */}
        <div className="card text-sm">
          <h4 className="font-bold text-white mb-2">Instructions:</h4>
          <ul className="text-gray-400 space-y-1">
            <li>• Drag ships to the board</li>
            <li>• Click rotate button or press R to rotate</li>
            <li>• Double-click placed ship to remove</li>
            <li>• Use Random to place all ships</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ShipPlacementBoard;
