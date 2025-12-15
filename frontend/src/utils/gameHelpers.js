import { BOARD_SIZE, CELL_STATES, ORIENTATIONS } from './gameConstants';

/**
 * Check if a ship placement is valid
 */
export const isValidPlacement = (board, ship, position, orientation) => {
  const { x, y } = position;
  const { size } = ship;

  // Check if ship fits on board
  if (orientation === ORIENTATIONS.HORIZONTAL) {
    if (x + size > BOARD_SIZE) return false;
  } else {
    if (y + size > BOARD_SIZE) return false;
  }

  // Check if cells are empty (no overlap with other ships)
  for (let i = 0; i < size; i++) {
    const checkX = orientation === ORIENTATIONS.HORIZONTAL ? x + i : x;
    const checkY = orientation === ORIENTATIONS.VERTICAL ? y + i : y;

    if (board[checkY][checkX] === CELL_STATES.SHIP) {
      return false;
    }
  }

  return true;
};

/**
 * Place a ship on the board
 */
export const placeShipOnBoard = (board, ship, position, orientation) => {
  const newBoard = board.map((row) => [...row]);
  const { x, y } = position;
  const { size } = ship;

  for (let i = 0; i < size; i++) {
    const placeX = orientation === ORIENTATIONS.HORIZONTAL ? x + i : x;
    const placeY = orientation === ORIENTATIONS.VERTICAL ? y + i : y;
    newBoard[placeY][placeX] = CELL_STATES.SHIP;
  }

  return newBoard;
};

/**
 * Remove a ship from the board
 */
export const removeShipFromBoard = (board, ship) => {
  if (!ship.position) return board;

  const newBoard = board.map((row) => [...row]);
  const { x, y } = ship.position;
  const { size, orientation } = ship;

  for (let i = 0; i < size; i++) {
    const removeX = orientation === ORIENTATIONS.HORIZONTAL ? x + i : x;
    const removeY = orientation === ORIENTATIONS.VERTICAL ? y + i : y;
    newBoard[removeY][removeX] = CELL_STATES.EMPTY;
  }

  return newBoard;
};

/**
 * Generate random ship placement
 */
export const generateRandomPlacement = (ships) => {
  let board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(CELL_STATES.EMPTY));

  const placedShips = ships.map((ship) => {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!placed && attempts < maxAttempts) {
      const orientation = Math.random() > 0.5 ? ORIENTATIONS.HORIZONTAL : ORIENTATIONS.VERTICAL;
      const x = Math.floor(Math.random() * BOARD_SIZE);
      const y = Math.floor(Math.random() * BOARD_SIZE);

      if (isValidPlacement(board, ship, { x, y }, orientation)) {
        board = placeShipOnBoard(board, ship, { x, y }, orientation);
        placed = true;
        return {
          ...ship,
          position: { x, y },
          orientation,
        };
      }

      attempts++;
    }

    // If failed to place, return ship without position
    return ship;
  });

  return { ships: placedShips, board };
};

/**
 * Check if all ships are placed
 */
export const areAllShipsPlaced = (ships) => {
  return ships.every((ship) => ship.position !== null);
};

/**
 * Check if a ship is sunk
 */
export const isShipSunk = (ship) => {
  if (!ship.position || !ship.hits) return false;
  return ship.hits.length >= ship.size;
};

/**
 * Check if all ships are sunk
 */
export const areAllShipsSunk = (ships) => {
  return ships.every((ship) => isShipSunk(ship));
};

/**
 * Process an attack on the board
 */
export const processAttack = (board, ships, x, y) => {
  const cellState = board[y][x];

  // Already attacked
  if (cellState === CELL_STATES.HIT || cellState === CELL_STATES.MISS) {
    return { valid: false, result: null };
  }

  // Hit
  if (cellState === CELL_STATES.SHIP) {
    const newBoard = board.map((row) => [...row]);
    newBoard[y][x] = CELL_STATES.HIT;

    // Find which ship was hit
    const hitShip = ships.find((ship) => {
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

    if (hitShip) {
      const updatedHits = [...(hitShip.hits || []), { x, y }];
      const sunk = updatedHits.length >= hitShip.size;

      return {
        valid: true,
        result: 'hit',
        board: newBoard,
        shipId: hitShip.id,
        sunk,
        hits: updatedHits,
      };
    }
  }

  // Miss
  const newBoard = board.map((row) => [...row]);
  newBoard[y][x] = CELL_STATES.MISS;

  return {
    valid: true,
    result: 'miss',
    board: newBoard,
  };
};
