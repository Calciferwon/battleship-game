// Game board configuration
export const BOARD_SIZE = 10;
export const CELL_SIZE = 40; // pixels

// Cell states
export const CELL_STATES = {
  EMPTY: 'empty',
  SHIP: 'ship',
  HIT: 'hit',
  MISS: 'miss',
};

// Ship configurations
export const SHIPS = [
  { id: 'carrier', name: 'Carrier', size: 5, color: '#EF4444' },
  { id: 'battleship', name: 'Battleship', size: 4, color: '#F59E0B' },
  { id: 'cruiser', name: 'Cruiser', size: 3, color: '#10B981' },
  { id: 'submarine', name: 'Submarine', size: 3, color: '#3B82F6' },
  { id: 'destroyer', name: 'Destroyer', size: 2, color: '#8B5CF6' },
];

// Orientations
export const ORIENTATIONS = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
};

// Game status
export const GAME_STATUS = {
  WAITING: 'waiting',
  SETUP: 'setup',
  WAITING_FOR_OPPONENT: 'waiting_for_opponent',
  PLAYING: 'playing',
  FINISHED: 'finished',
};

// Coordinate labels
export const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

// Helper functions
export const getCoordinateLabel = (x, y) => {
  return `${COLUMN_LABELS[x]}${ROW_LABELS[y]}`;
};

export const createEmptyBoard = () => {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(CELL_STATES.EMPTY));
};

export const createEmptyShips = () => {
  return SHIPS.map((ship) => ({
    ...ship,
    position: null,
    orientation: ORIENTATIONS.HORIZONTAL,
    hits: [],
    sunk: false,
  }));
};
