import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  isValidPlacement,
  placeShipOnBoard,
  checkHit,
  isShipSunk,
  allShipsSunk,
} from '../utils/gameHelpers';

describe('Game Helper Functions', () => {
  describe('createEmptyBoard', () => {
    it('creates a 10x10 board', () => {
      const board = createEmptyBoard();

      expect(board).toHaveLength(10);
      expect(board[0]).toHaveLength(10);
    });

    it('initializes all cells to null', () => {
      const board = createEmptyBoard();

      board.forEach((row) => {
        row.forEach((cell) => {
          expect(cell).toBeNull();
        });
      });
    });
  });

  describe('isValidPlacement', () => {
    it('allows valid horizontal placement', () => {
      const board = createEmptyBoard();
      const ship = { size: 5 };
      const position = { x: 0, y: 0 };
      const orientation = 'horizontal';

      const result = isValidPlacement(board, ship, position, orientation);

      expect(result.valid).toBe(true);
    });

    it('allows valid vertical placement', () => {
      const board = createEmptyBoard();
      const ship = { size: 5 };
      const position = { x: 0, y: 0 };
      const orientation = 'vertical';

      const result = isValidPlacement(board, ship, position, orientation);

      expect(result.valid).toBe(true);
    });

    it('rejects placement that goes out of bounds horizontally', () => {
      const board = createEmptyBoard();
      const ship = { size: 5 };
      const position = { x: 6, y: 0 }; // Would go to x=10 (out of bounds)
      const orientation = 'horizontal';

      const result = isValidPlacement(board, ship, position, orientation);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('out of bounds');
    });

    it('rejects placement that goes out of bounds vertically', () => {
      const board = createEmptyBoard();
      const ship = { size: 5 };
      const position = { x: 0, y: 6 }; // Would go to y=10 (out of bounds)
      const orientation = 'vertical';

      const result = isValidPlacement(board, ship, position, orientation);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('out of bounds');
    });

    it('rejects overlapping ship placement', () => {
      const board = createEmptyBoard();

      // Place first ship
      const ship1 = { id: 'ship1', size: 5 };
      placeShipOnBoard(board, ship1, { x: 0, y: 0 }, 'horizontal');

      // Try to place second ship that overlaps
      const ship2 = { id: 'ship2', size: 3 };
      const result = isValidPlacement(board, ship2, { x: 0, y: 0 }, 'horizontal');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('overlap');
    });
  });

  describe('checkHit', () => {
    it('returns "miss" when attacking empty cell', () => {
      const board = createEmptyBoard();
      const result = checkHit(board, 0, 0);

      expect(result).toBe('miss');
    });

    it('returns "hit" when attacking cell with ship', () => {
      const board = createEmptyBoard();
      const ship = { id: 'carrier', size: 5 };

      placeShipOnBoard(board, ship, { x: 0, y: 0 }, 'horizontal');

      const result = checkHit(board, 0, 0);

      expect(result).toBe('hit');
    });

    it('returns null when attacking already attacked cell', () => {
      const board = createEmptyBoard();
      board[0][0] = 'miss'; // Already attacked

      const result = checkHit(board, 0, 0);

      expect(result).toBeNull(); // Already attacked
    });
  });

  describe('isShipSunk', () => {
    it('returns true when all ship positions are hit', () => {
      const ship = {
        id: 'carrier',
        size: 5,
        hits: [0, 1, 2, 3, 4], // All positions hit
      };

      const result = isShipSunk(ship);

      expect(result).toBe(true);
    });

    it('returns false when not all ship positions are hit', () => {
      const ship = {
        id: 'carrier',
        size: 5,
        hits: [0, 1, 2], // Only 3 positions hit
      };

      const result = isShipSunk(ship);

      expect(result).toBe(false);
    });
  });

  describe('allShipsSunk', () => {
    it('returns true when all ships are sunk', () => {
      const ships = [
        { id: 'carrier', size: 5, sunk: true },
        { id: 'battleship', size: 4, sunk: true },
        { id: 'cruiser', size: 3, sunk: true },
        { id: 'submarine', size: 3, sunk: true },
        { id: 'destroyer', size: 2, sunk: true },
      ];

      const result = allShipsSunk(ships);

      expect(result).toBe(true);
    });

    it('returns false when any ship is not sunk', () => {
      const ships = [
        { id: 'carrier', size: 5, sunk: true },
        { id: 'battleship', size: 4, sunk: false }, // Not sunk
        { id: 'cruiser', size: 3, sunk: true },
        { id: 'submarine', size: 3, sunk: true },
        { id: 'destroyer', size: 2, sunk: true },
      ];

      const result = allShipsSunk(ships);

      expect(result).toBe(false);
    });
  });
});
