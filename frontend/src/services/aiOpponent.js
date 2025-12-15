import { BOARD_SIZE, CELL_STATES } from '../utils/gameConstants';

/**
 * AI Opponent for single-player Battleship game
 * Implements multiple difficulty levels with progressively smarter targeting
 * 
 * Difficulty Levels:
 * - Easy: Random attacks with slight clustering avoidance
 * - Medium: Checkerboard hunting + smart adjacent targeting on hits
 * - Hard: Probability-based targeting with ship size awareness
 * - Expert: Advanced probability + parity optimization + ship density analysis
 */
class AIOpponent {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
    this.targetQueue = []; // Priority queue of cells to target
    this.lastHit = null;
    this.hitStreak = []; // Connected hits for finding ship orientation
    this.attackedCells = new Set();
    this.huntMode = false;
    this.sunkShips = []; // Track sunk ship sizes for better probability calculations
    this.consecutiveMisses = 0; // Track misses to adjust strategy
  }

  /**
   * Reset AI state for a new game
   */
  reset() {
    this.targetQueue = [];
    this.lastHit = null;
    this.hitStreak = [];
    this.attackedCells = new Set();
    this.huntMode = false;
    this.sunkShips = [];
    this.consecutiveMisses = 0;
  }

  /**
   * Get AI's next move
   * @param {Array} opponentBoard - The board to attack (player's board)
   * @param {Array} ships - Opponent's ships info
   * @returns {Object} {x, y} coordinates
   */
  getNextMove(opponentBoard, ships = []) {
    // Check if we have queued targets (after a hit)
    if (this.targetQueue.length > 0) {
      const target = this.targetQueue.shift();
      if (this.isValidTarget(target.x, target.y)) {
        return target;
      }
      // If target was invalid, get another one
      return this.getNextMove(opponentBoard, ships);
    }

    // Choose strategy based on difficulty
    switch (this.difficulty) {
      case 'easy':
        return this.getEasyMove(opponentBoard);
      case 'medium':
        return this.getMediumMove(opponentBoard);
      case 'hard':
        return this.getHardMove(opponentBoard, ships);
      case 'expert':
        return this.getExpertMove(opponentBoard, ships);
      default:
        return this.getMediumMove(opponentBoard);
    }
  }

  /**
   * Easy mode - Random attacks with slight improvements
   * - Avoids shooting too close to recent misses
   * - Occasionally uses checkerboard pattern by accident
   */
  getEasyMove(opponentBoard) {
    let x, y;
    let attempts = 0;
    const maxAttempts = 100;

    // 30% chance to use checkerboard logic (simulating lucky guessing)
    const useCheckerboard = Math.random() < 0.3;

    if (useCheckerboard) {
      // Try checkerboard pattern
      for (let yPos = 0; yPos < BOARD_SIZE; yPos++) {
        for (let xPos = 0; xPos < BOARD_SIZE; xPos++) {
          if ((xPos + yPos) % 2 === 0 && this.isValidTarget(xPos, yPos)) {
            // 70% chance to actually pick this cell (simulate imperfect play)
            if (Math.random() < 0.7) {
              return { x: xPos, y: yPos };
            }
          }
        }
      }
    }

    // Random selection with slight clustering avoidance
    do {
      x = Math.floor(Math.random() * BOARD_SIZE);
      y = Math.floor(Math.random() * BOARD_SIZE);
      
      // Avoid cells adjacent to recent misses (25% of the time)
      if (Math.random() < 0.25 && this.hasAdjacentMiss(x, y, opponentBoard)) {
        continue;
      }
      
      attempts++;
    } while (!this.isValidTarget(x, y) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return this.findFirstValidTarget();
    }

    return { x, y };
  }

  /**
   * Medium mode - Checkerboard pattern + smart targeting after hits
   * - Always uses checkerboard in hunt mode
   * - Intelligently targets adjacent cells after hits
   * - Learns ship orientation from multiple hits
   */
  getMediumMove(opponentBoard) {
    // Use checkerboard pattern for hunting
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        // Checkerboard pattern (only attack every other cell)
        if ((x + y) % 2 === 0 && this.isValidTarget(x, y)) {
          return { x, y };
        }
      }
    }

    // If checkerboard is complete, fill in remaining cells
    return this.findFirstValidTarget();
  }

  /**
   * Hard mode - Probability-based targeting + ship size awareness
   * - Calculates probability map based on possible ship placements
   * - Considers which ships are still alive
   * - Weights cells near known hits higher
   * - Uses ship density analysis
   */
  getHardMove(opponentBoard, ships) {
    // Calculate probability map for each cell
    const probabilityMap = this.calculateProbabilityMap(opponentBoard, ships);
    
    // Add bonus to cells near hits (but not already hit)
    if (this.hitStreak.length > 0) {
      this.hitStreak.forEach(hit => {
        const adjacent = [
          {x: hit.x - 1, y: hit.y},
          {x: hit.x + 1, y: hit.y},
          {x: hit.x, y: hit.y - 1},
          {x: hit.x, y: hit.y + 1}
        ];
        adjacent.forEach(cell => {
          if (cell.x >= 0 && cell.x < BOARD_SIZE && cell.y >= 0 && cell.y < BOARD_SIZE) {
            probabilityMap[cell.y][cell.x] += 20; // Bonus for cells near hits
          }
        });
      });
    }
    
    // Find cell with highest probability
    let maxProb = 0;
    let bestTargets = [];

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.isValidTarget(x, y)) {
          const prob = probabilityMap[y][x];
          if (prob > maxProb) {
            maxProb = prob;
            bestTargets = [{ x, y }];
          } else if (prob === maxProb && prob > 0) {
            bestTargets.push({ x, y });
          }
        }
      }
    }

    // If no good targets found, fall back to checkerboard
    if (bestTargets.length === 0 || maxProb === 0) {
      return this.getMediumMove(opponentBoard);
    }

    // Pick randomly from best targets
    return bestTargets[Math.floor(Math.random() * bestTargets.length)];
  }

  /**
   * Expert mode - Advanced AI with near-perfect play
   * - Uses parity optimization for maximum efficiency
   * - Advanced ship density and clustering analysis
   * - Predictive targeting based on common placement patterns
   * - Adaptive strategy based on game state
   */
  getExpertMove(opponentBoard, ships) {
    // Calculate probability map
    const probabilityMap = this.calculateAdvancedProbabilityMap(opponentBoard, ships);
    
    // Apply parity optimization (checkerboard on steroids)
    this.applyParityOptimization(probabilityMap, ships);
    
    // Apply ship density analysis
    this.applyDensityAnalysis(probabilityMap, opponentBoard);
    
    // Heavily weight cells that complete patterns
    this.applyPatternCompletion(probabilityMap, opponentBoard);
    
    // Find best targets
    let maxProb = 0;
    let bestTargets = [];

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.isValidTarget(x, y)) {
          const prob = probabilityMap[y][x];
          if (prob > maxProb) {
            maxProb = prob;
            bestTargets = [{ x, y }];
          } else if (prob === maxProb && prob > 0) {
            bestTargets.push({ x, y });
          }
        }
      }
    }

    if (bestTargets.length === 0) {
      return this.getMediumMove(opponentBoard);
    }

    // Pick target with best strategic position (prefer center early game)
    if (this.attackedCells.size < 30) {
      bestTargets.sort((a, b) => {
        const distA = Math.abs(a.x - 4.5) + Math.abs(a.y - 4.5);
        const distB = Math.abs(b.x - 4.5) + Math.abs(b.y - 4.5);
        return distA - distB; // Prefer center cells
      });
    }

    return bestTargets[0];
  }

  /**
   * Calculate probability map for hard mode
   */
  calculateProbabilityMap(opponentBoard, ships) {
    const map = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    
    // For each unsunk ship, calculate possible placements
    const unsunkShips = ships.filter(ship => !ship.sunk);
    
    unsunkShips.forEach(ship => {
      // Try horizontal placements
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x <= BOARD_SIZE - ship.size; x++) {
          if (this.canPlaceShip(opponentBoard, x, y, ship.size, 'horizontal')) {
            for (let i = 0; i < ship.size; i++) {
              map[y][x + i]++;
            }
          }
        }
      }

      // Try vertical placements
      for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y <= BOARD_SIZE - ship.size; y++) {
          if (this.canPlaceShip(opponentBoard, x, y, ship.size, 'vertical')) {
            for (let i = 0; i < ship.size; i++) {
              map[y + i][x]++;
            }
          }
        }
      }
    });

    return map;
  }

  /**
   * Check if a ship can be placed at given position
   */
  canPlaceShip(board, x, y, size, orientation) {
    for (let i = 0; i < size; i++) {
      const checkX = orientation === 'horizontal' ? x + i : x;
      const checkY = orientation === 'vertical' ? y + i : y;
      
      const cellKey = `${checkX},${checkY}`;
      if (this.attackedCells.has(cellKey)) {
        const cellState = board[checkY]?.[checkX];
        if (cellState === CELL_STATES.MISS) {
          return false; // Can't place ship where we found a miss
        }
      }
    }
    return true;
  }

  /**
   * Process the result of AI's last attack
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate  
   * @param {boolean} isHit - Whether the attack was a hit
   * @param {boolean} isSunk - Whether a ship was sunk
   */
  processAttackResult(x, y, isHit, isSunk, shipSize = null) {
    const cellKey = `${x},${y}`;
    this.attackedCells.add(cellKey);

    if (isHit) {
      this.lastHit = { x, y };
      this.hitStreak.push({ x, y });
      this.consecutiveMisses = 0;

      if (isSunk) {
        // Ship sunk, track it and clear targeting
        if (shipSize) {
          this.sunkShips.push(shipSize);
        }
        this.targetQueue = [];
        this.hitStreak = [];
        this.lastHit = null;
        this.huntMode = false;
      } else {
        // Hit but not sunk - enter hunt mode
        this.huntMode = true;
        this.addAdjacentTargets(x, y);
      }
    } else {
      // Miss
      this.consecutiveMisses++;
      
      // If we're in hunt mode with no targets left, try opposite direction
      if (this.huntMode && this.targetQueue.length === 0 && this.hitStreak.length > 0) {
        this.addOppositeDirectionTargets();
      }
    }
  }

  /**
   * Add adjacent cells to target queue
   */
  addAdjacentTargets(x, y) {
    const directions = [
      { x: x, y: y - 1 }, // Up
      { x: x, y: y + 1 }, // Down
      { x: x - 1, y: y }, // Left
      { x: x + 1, y: y }, // Right
    ];

    // If we have multiple hits, determine ship orientation
    if (this.hitStreak.length >= 2) {
      const isHorizontal = this.hitStreak[0].y === this.hitStreak[1].y;
      const isVertical = this.hitStreak[0].x === this.hitStreak[1].x;

      if (isHorizontal) {
        // Only add horizontal targets
        const minX = Math.min(...this.hitStreak.map(h => h.x));
        const maxX = Math.max(...this.hitStreak.map(h => h.x));
        this.targetQueue = [
          { x: minX - 1, y: y },
          { x: maxX + 1, y: y }
        ].filter(t => this.isValidTarget(t.x, t.y));
        return;
      } else if (isVertical) {
        // Only add vertical targets
        const minY = Math.min(...this.hitStreak.map(h => h.y));
        const maxY = Math.max(...this.hitStreak.map(h => h.y));
        this.targetQueue = [
          { x: x, y: minY - 1 },
          { x: x, y: maxY + 1 }
        ].filter(t => this.isValidTarget(t.x, t.y));
        return;
      }
    }

    // First hit - add all adjacent cells
    directions.forEach(target => {
      if (this.isValidTarget(target.x, target.y)) {
        this.targetQueue.push(target);
      }
    });
  }

  /**
   * Add targets in opposite direction (when we hit edge of ship)
   */
  addOppositeDirectionTargets() {
    if (this.hitStreak.length < 2) return;

    const first = this.hitStreak[0];
    const last = this.hitStreak[this.hitStreak.length - 1];

    // Determine orientation
    if (first.y === last.y) {
      // Horizontal - try opposite ends
      const minX = Math.min(first.x, last.x);
      const maxX = Math.max(first.x, last.x);
      this.targetQueue.push(
        { x: minX - 1, y: first.y },
        { x: maxX + 1, y: first.y }
      );
    } else if (first.x === last.x) {
      // Vertical - try opposite ends
      const minY = Math.min(first.y, last.y);
      const maxY = Math.max(first.y, last.y);
      this.targetQueue.push(
        { x: first.x, y: minY - 1 },
        { x: first.x, y: maxY + 1 }
      );
    }

    // Filter out invalid targets
    this.targetQueue = this.targetQueue.filter(t => 
      this.isValidTarget(t.x, t.y)
    );
  }

  /**
   * Check if a target is valid (in bounds and not already attacked)
   */
  isValidTarget(x, y) {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
      return false;
    }

    const cellKey = `${x},${y}`;
    return !this.attackedCells.has(cellKey);
  }

  /**
   * Find first valid target (fallback method)
   */
  findFirstValidTarget() {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.isValidTarget(x, y)) {
          return { x, y };
        }
      }
    }
    return { x: 0, y: 0 }; // Should never happen
  }

  /**
   * Check if cell has adjacent misses (for easy mode)
   */
  hasAdjacentMiss(x, y, board) {
    const adjacent = [
      {x: x-1, y}, {x: x+1, y}, {x, y: y-1}, {x, y: y+1}
    ];
    
    return adjacent.some(cell => {
      if (cell.x >= 0 && cell.x < BOARD_SIZE && cell.y >= 0 && cell.y < BOARD_SIZE) {
        return board[cell.y][cell.x] === CELL_STATES.MISS;
      }
      return false;
    });
  }

  /**
   * Calculate advanced probability map for expert mode
   */
  calculateAdvancedProbabilityMap(opponentBoard, ships) {
    const map = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    
    // Get unsunk ships
    const unsunkShips = ships.filter(ship => !ship.sunk);
    
    // For each unsunk ship, calculate all possible placements
    unsunkShips.forEach(ship => {
      const placements = this.getAllValidPlacements(opponentBoard, ship.size);
      
      placements.forEach(placement => {
        placement.cells.forEach(cell => {
          map[cell.y][cell.x] += ship.size; // Weight by ship size
        });
      });
    });

    return map;
  }

  /**
   * Get all valid placements for a ship of given size
   */
  getAllValidPlacements(board, size) {
    const placements = [];
    
    // Horizontal placements
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x <= BOARD_SIZE - size; x++) {
        if (this.canPlaceShip(board, x, y, size, 'horizontal')) {
          const cells = [];
          for (let i = 0; i < size; i++) {
            cells.push({ x: x + i, y });
          }
          placements.push({ cells, orientation: 'horizontal' });
        }
      }
    }

    // Vertical placements
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y <= BOARD_SIZE - size; y++) {
        if (this.canPlaceShip(board, x, y, size, 'vertical')) {
          const cells = [];
          for (let i = 0; i < size; i++) {
            cells.push({ x, y: y + i });
          }
          placements.push({ cells, orientation: 'vertical' });
        }
      }
    }

    return placements;
  }

  /**
   * Apply parity optimization (for expert mode)
   */
  applyParityOptimization(probabilityMap, ships) {
    const unsunkShips = ships.filter(s => !s.sunk);
    const smallestShip = Math.min(...unsunkShips.map(s => s.size));
    
    // If smallest ship is 3+, emphasize checkerboard pattern
    if (smallestShip >= 3) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if ((x + y) % 2 === 0) {
            probabilityMap[y][x] *= 1.5;
          }
        }
      }
    }
  }

  /**
   * Apply density analysis (for expert mode)
   */
  applyDensityAnalysis(probabilityMap, board) {
    // Prefer areas with fewer attacks (unexplored regions)
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.isValidTarget(x, y)) {
          const attackedNeighbors = this.countAttackedNeighbors(x, y);
          // Slightly prefer less-explored areas
          probabilityMap[y][x] *= (1 + (8 - attackedNeighbors) * 0.05);
        }
      }
    }
  }

  /**
   * Count attacked neighbors
   */
  countAttackedNeighbors(x, y) {
    const neighbors = [
      {x: x-1, y: y-1}, {x, y: y-1}, {x: x+1, y: y-1},
      {x: x-1, y},                    {x: x+1, y},
      {x: x-1, y: y+1}, {x, y: y+1}, {x: x+1, y: y+1}
    ];
    
    return neighbors.filter(n => {
      if (n.x >= 0 && n.x < BOARD_SIZE && n.y >= 0 && n.y < BOARD_SIZE) {
        const key = `${n.x},${n.y}`;
        return this.attackedCells.has(key);
      }
      return false;
    }).length;
  }

  /**
   * Apply pattern completion (for expert mode)
   */
  applyPatternCompletion(probabilityMap, board) {
    // Look for hit patterns and weight cells that would complete ships
    this.hitStreak.forEach(hit => {
      // Check if this hit could be part of a larger pattern
      const possibleExtensions = [
        {x: hit.x - 1, y: hit.y}, {x: hit.x + 1, y: hit.y},
        {x: hit.x, y: hit.y - 1}, {x: hit.x, y: hit.y + 1}
      ];
      
      possibleExtensions.forEach(cell => {
        if (cell.x >= 0 && cell.x < BOARD_SIZE && cell.y >= 0 && cell.y < BOARD_SIZE) {
          if (this.isValidTarget(cell.x, cell.y)) {
            probabilityMap[cell.y][cell.x] *= 3; // Heavy weight for pattern completion
          }
        }
      });
    });
  }

  /**
   * Set difficulty level
   */
  setDifficulty(difficulty) {
    this.difficulty = difficulty;
  }
}

export default AIOpponent;
