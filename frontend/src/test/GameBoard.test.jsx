import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameBoard from '../components/GameBoard';

describe('GameBoard Component', () => {
  const mockBoard = Array(10)
    .fill(null)
    .map(() => Array(10).fill(null));

  const mockOnCellClick = vi.fn();

  it('renders without crashing', () => {
    render(
      <GameBoard
        board={mockBoard}
        isMyTurn={false}
        title="Test Board"
        onCellClick={mockOnCellClick}
        showShips={false}
      />
    );

    expect(screen.getByText('Test Board')).toBeInTheDocument();
  });

  it('renders 10x10 grid (100 cells)', () => {
    const { container } = render(
      <GameBoard
        board={mockBoard}
        isMyTurn={false}
        title="Test Board"
        onCellClick={mockOnCellClick}
        showShips={false}
      />
    );

    // Count grid cells
    const cells = container.querySelectorAll('[data-testid^="cell-"]');
    expect(cells.length).toBe(100);
  });

  it('calls onCellClick when cell is clicked', () => {
    const { container } = render(
      <GameBoard
        board={mockBoard}
        isMyTurn={true}
        title="Test Board"
        onCellClick={mockOnCellClick}
        showShips={false}
      />
    );

    const firstCell = container.querySelector('[data-testid="cell-0-0"]');
    fireEvent.click(firstCell);

    expect(mockOnCellClick).toHaveBeenCalledWith(0, 0);
  });

  it('displays hit marker correctly', () => {
    const boardWithHit = mockBoard.map((row) => [...row]);
    boardWithHit[0][0] = 'hit';

    const { container } = render(
      <GameBoard
        board={boardWithHit}
        isMyTurn={false}
        title="Test Board"
        onCellClick={mockOnCellClick}
        showShips={false}
      />
    );

    const hitCell = container.querySelector('[data-testid="cell-0-0"]');
    expect(hitCell).toHaveClass('hit'); // Adjust based on actual class name
  });

  it('displays miss marker correctly', () => {
    const boardWithMiss = mockBoard.map((row) => [...row]);
    boardWithMiss[1][1] = 'miss';

    const { container } = render(
      <GameBoard
        board={boardWithMiss}
        isMyTurn={false}
        title="Test Board"
        onCellClick={mockOnCellClick}
        showShips={false}
      />
    );

    const missCell = container.querySelector('[data-testid="cell-1-1"]');
    expect(missCell).toHaveClass('miss'); // Adjust based on actual class name
  });

  it('disables clicks when not players turn', () => {
    const { container } = render(
      <GameBoard
        board={mockBoard}
        isMyTurn={false}
        title="Test Board"
        onCellClick={mockOnCellClick}
        showShips={false}
      />
    );

    const firstCell = container.querySelector('[data-testid="cell-0-0"]');
    fireEvent.click(firstCell);

    // Should not call onClick when it's not player's turn
    expect(mockOnCellClick).not.toHaveBeenCalled();
  });
});
