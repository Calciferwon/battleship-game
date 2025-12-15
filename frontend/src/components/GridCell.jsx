import { useState, useEffect } from 'react';
import { CELL_STATES } from '../utils/gameConstants';

const GridCell = ({
  x,
  y,
  state,
  isOpponentBoard = false,
  isHovering = false,
  isValidTarget = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  disabled = false,
}) => {
  const [animating, setAnimating] = useState(false);
  const [prevState, setPrevState] = useState(state);

  // Trigger animation when cell state changes to HIT or MISS
  useEffect(() => {
    if (state !== prevState && (state === CELL_STATES.HIT || state === CELL_STATES.MISS)) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 600);
      return () => clearTimeout(timer);
    }
    setPrevState(state);
  }, [state, prevState]);

  const getCellClasses = () => {
    const baseClasses = 'w-10 h-10 border transition-all duration-200 flex items-center justify-center text-sm font-bold relative';

    let stateClasses = '';
    let animationClasses = '';

    // Add animation classes
    if (animating) {
      if (state === CELL_STATES.HIT) {
        animationClasses = 'animate-hit-explosion';
      } else if (state === CELL_STATES.MISS) {
        animationClasses = 'animate-miss-splash';
      }
    }

    if (state === CELL_STATES.EMPTY) {
      if (isOpponentBoard) {
        stateClasses = 'bg-ocean-900 border-ocean-700';
        if (!disabled && isValidTarget) {
          stateClasses += ' hover:bg-ocean-800';
          if (isHovering) {
            stateClasses = 'bg-ocean-700 border-ocean-500 cursor-crosshair';
          } else {
            stateClasses += ' cursor-pointer';
          }
        }
      } else {
        stateClasses = 'bg-ocean-900 border-ocean-700';
      }
    } else if (state === CELL_STATES.SHIP) {
      // Only show ships on player's own board
      if (isOpponentBoard) {
        stateClasses = 'bg-ocean-900 border-ocean-700';
        if (!disabled && isValidTarget) {
          stateClasses += ' hover:bg-ocean-800 cursor-pointer';
        }
      } else {
        stateClasses = 'bg-navy-600 border-navy-500';
      }
    } else if (state === CELL_STATES.HIT) {
      stateClasses = 'bg-red-600 border-red-500';
    } else if (state === CELL_STATES.MISS) {
      stateClasses = 'bg-gray-600 border-gray-500';
    }

    return `${baseClasses} ${stateClasses} ${animationClasses}`;
  };

  const getCellContent = () => {
    if (state === CELL_STATES.HIT) {
      return (
        <span className={`text-white text-xl ${animating ? 'animate-bounce-in' : ''}`}>💥</span>
      );
    } else if (state === CELL_STATES.MISS) {
      return (
        <span className={`text-white text-xl ${animating ? 'animate-bounce-in' : ''}`}>💨</span>
      );
    } else if (state === CELL_STATES.SHIP && !isOpponentBoard) {
      return (
        <span className="text-ocean-300">⬛</span>
      );
    }
    return null;
  };

  return (
    <div
      className={getCellClasses()}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-x={x}
      data-y={y}
      role="button"
      tabIndex={isValidTarget ? 0 : -1}
      aria-label={`Cell ${String.fromCharCode(65 + x)}${y + 1}`}
    >
      {getCellContent()}
    </div>
  );
};

export default GridCell;
