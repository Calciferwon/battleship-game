import React from 'react';
import { CELL_STATES } from '../utils/gameConstants';
import { Loader2 } from 'lucide-react';

const GameResultModal = ({ 
  isWinner, 
  myBoard, 
  opponentBoard, 
  onClose,
  isLoading = false
}) => {
  const renderBoard = (board, title, revealShips = false) => {
    return (
      <div className="result-board">
        <h3>{title}</h3>
        <div className="board-grid">
          {/* Column labels */}
          <div className="board-row">
            <div className="board-cell label"></div>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="board-cell label">
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          
          {/* Board rows */}
          {board.map((row, y) => (
            <div key={y} className="board-row">
              <div className="board-cell label">{y + 1}</div>
              {row.map((cell, x) => {
                let cellClass = 'board-cell';
                let content = '';
                
                if (cell === CELL_STATES.HIT) {
                  cellClass += ' hit';
                  content = '💥';
                } else if (cell === CELL_STATES.MISS) {
                  cellClass += ' miss';
                  content = '💨';
                } else if (cell === CELL_STATES.SHIP && revealShips) {
                  cellClass += ' ship';
                  content = '🚢';
                }
                
                return (
                  <div key={x} className={cellClass}>
                    {content}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const countStats = (board) => {
    let hits = 0;
    let misses = 0;
    let ships = 0;
    
    board.forEach(row => {
      row.forEach(cell => {
        if (cell === CELL_STATES.HIT) hits++;
        else if (cell === CELL_STATES.MISS) misses++;
        else if (cell === CELL_STATES.SHIP) ships++;
      });
    });
    
    return { hits, misses, ships, accuracy: misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0 };
  };

  const myStats = countStats(myBoard);
  const opponentStats = countStats(opponentBoard);

  return (
    <div className="game-result-overlay">
      <div className="game-result-modal">
        {/* Header */}
        <div className={`result-header ${isWinner ? 'winner' : 'loser'}`}>
          <div className="result-icon">
            {isWinner ? '🏆' : '💀'}
          </div>
          <h1 className="result-title">
            {isWinner ? 'VICTORY!' : 'DEFEAT'}
          </h1>
          <p className="result-subtitle">
            {isWinner 
              ? 'You destroyed all enemy ships!' 
              : 'All your ships were destroyed!'}
          </p>
        </div>

        {/* Stats */}
        <div className="result-stats">
          <div className="stat-card">
            <h4>Your Performance</h4>
            <div className="stat-row">
              <span>Hits:</span>
              <span className="stat-value">{myStats.hits} / 18</span>
            </div>
            <div className="stat-row">
              <span>Accuracy:</span>
              <span className="stat-value">{myStats.accuracy}%</span>
            </div>
            <div className="stat-row">
              <span>Ships Lost:</span>
              <span className="stat-value">{18 - myStats.ships - myStats.hits} / 18</span>
            </div>
          </div>
          
          <div className="stat-card">
            <h4>Opponent Stats</h4>
            <div className="stat-row">
              <span>Ships Destroyed:</span>
              <span className="stat-value">{opponentStats.hits} / 18</span>
            </div>
            <div className="stat-row">
              <span>Accuracy:</span>
              <span className="stat-value">{opponentStats.accuracy}%</span>
            </div>
          </div>
        </div>

        {/* Boards */}
        <div className="result-boards">
          {renderBoard(myBoard, 'Your Board', true)}
          {renderBoard(opponentBoard, "Opponent's Board", true)}
        </div>

        {/* Close Button */}
        <button 
          className="close-button" 
          onClick={onClose}
          disabled={isLoading}
          style={{ opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Loader2 className="animate-spin" size={20} />
              Completing Match...
            </span>
          ) : (
            'Return to Tournament'
          )}
        </button>
      </div>

      <style jsx>{`
        .game-result-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          overflow-y: auto;
        }

        .game-result-modal {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border-radius: 24px;
          padding: 32px;
          max-width: 1200px;
          width: 100%;
          border: 2px solid rgba(148, 163, 184, 0.3);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.4s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .result-header {
          text-align: center;
          margin-bottom: 32px;
          padding: 24px;
          border-radius: 16px;
          border: 2px solid;
        }

        .result-header.winner {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%);
          border-color: rgba(16, 185, 129, 0.4);
        }

        .result-header.loser {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.1) 100%);
          border-color: rgba(239, 68, 68, 0.4);
        }

        .result-icon {
          font-size: 80px;
          margin-bottom: 16px;
          animation: bounce 0.6s ease-out;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        .result-title {
          font-size: 48px;
          font-weight: 800;
          margin: 0 0 8px 0;
          color: #f1f5f9;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        .result-subtitle {
          font-size: 20px;
          color: #94a3b8;
          margin: 0;
        }

        .result-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          padding: 20px;
          backdrop-filter: blur(10px);
        }

        .stat-card h4 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          color: #cbd5e1;
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .stat-value {
          font-weight: 600;
          color: #f1f5f9;
          font-size: 16px;
        }

        .result-boards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .result-board h3 {
          margin: 0 0 16px 0;
          font-size: 20px;
          font-weight: 600;
          color: #f1f5f9;
          text-align: center;
        }

        .board-grid {
          display: inline-block;
          background: rgba(15, 23, 42, 0.6);
          border: 2px solid rgba(148, 163, 184, 0.3);
          border-radius: 12px;
          padding: 16px;
          backdrop-filter: blur(10px);
        }

        .board-row {
          display: flex;
          gap: 2px;
        }

        .board-cell {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          border-radius: 4px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .board-cell.label {
          background: transparent;
          border: none;
          font-weight: 600;
          color: #94a3b8;
          font-size: 12px;
        }

        .board-cell.hit {
          background: rgba(239, 68, 68, 0.3);
          border-color: rgba(239, 68, 68, 0.6);
        }

        .board-cell.miss {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.4);
        }

        .board-cell.ship {
          background: rgba(100, 116, 139, 0.4);
          border-color: rgba(148, 163, 184, 0.5);
        }

        .close-button {
          width: 100%;
          padding: 16px 32px;
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .close-button:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }

        .close-button:active {
          transform: translateY(0);
        }

        @media (max-width: 968px) {
          .result-boards {
            grid-template-columns: 1fr;
          }

          .board-cell {
            width: 28px;
            height: 28px;
            font-size: 12px;
          }

          .result-title {
            font-size: 36px;
          }

          .result-icon {
            font-size: 60px;
          }
        }
      `}</style>
    </div>
  );
};

export default GameResultModal;
