import { useState } from 'react';
import GridCell from './GridCell';
import { BOARD_SIZE, COLUMN_LABELS, ROW_LABELS, CELL_STATES } from '../utils/gameConstants';

const GameBoard = ({
  board,
  ships = [],
  isMyBoard = false,
  isOpponentBoard = false,
  isMyTurn = false,
  onCellClick,
  title = 'Board',
  showShips = false,
  disabled = false,
}) => {
  const [hoveredCell, setHoveredCell] = useState(null);

  const handleCellClick = (x, y) => {
    if (disabled) return;
    if (onCellClick && isValidTarget(x, y)) {
      onCellClick(x, y);
    }
  };

  const isValidTarget = (x, y) => {
    if (disabled) return false;
    if (!isOpponentBoard || !isMyTurn) return false;
    const cellState = board[y][x];
    return cellState === CELL_STATES.EMPTY || cellState === CELL_STATES.SHIP;
  };

  const handleMouseEnter = (x, y) => {
    setHoveredCell({ x, y });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  return (
    <div className="flex flex-col">
      {/* Title */}
      <h3 className="text-lg font-bold text-white mb-2 text-center">{title}</h3>

      {/* Board Container */}
      <div className="inline-flex flex-col bg-navy-800 p-4 rounded-lg border-2 border-navy-700">
        {/* Column Labels */}
        <div className="flex mb-1">
          <div className="w-6"></div> {/* Spacer for row labels */}
          {COLUMN_LABELS.map((label) => (
            <div
              key={label}
              className="w-10 h-6 flex items-center justify-center text-ocean-400 text-sm font-bold"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid Rows */}
        {board.map((row, y) => (
          <div key={y} className="flex">
            {/* Row Label */}
            <div className="w-6 h-10 flex items-center justify-center text-ocean-400 text-sm font-bold">
              {ROW_LABELS[y]}
            </div>

            {/* Grid Cells */}
            {row.map((cellState, x) => (
              <GridCell
                key={`${x}-${y}`}
                x={x}
                y={y}
                state={cellState}
                isOpponentBoard={isOpponentBoard}
                isHovering={hoveredCell?.x === x && hoveredCell?.y === y}
                isValidTarget={isValidTarget(x, y)}
                onClick={() => handleCellClick(x, y)}
                onMouseEnter={() => handleMouseEnter(x, y)}
                onMouseLeave={handleMouseLeave}
                disabled={disabled}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Board Info */}
      <div className="mt-2 text-center text-sm text-gray-400">
        {isOpponentBoard ? (
          isMyTurn ? (
            <span className="text-ocean-400 font-semibold">🎯 Your turn - Select a target</span>
          ) : (
            <span>Waiting for opponent...</span>
          )
        ) : (
          <span>Your Board</span>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
