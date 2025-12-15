import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useTournamentStore from '../stores/tournamentStore';
import useGameStore from '../stores/gameStore';
import LoadingSpinner from './LoadingSpinner';
import { ArrowLeft, Ship, RotateCw } from 'lucide-react';
import { CELL_STATES } from '../utils/gameConstants';

const GRID_SIZE = 10;
const SHIPS = [
  { name: 'Battleship', size: 4, count: 1 },
  { name: 'Cruiser', size: 3, count: 2 },
  { name: 'Destroyer', size: 2, count: 2 },
  { name: 'Submarine', size: 1, count: 4 },
];

const TournamentShipPlacement = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { activeTournament, currentBracket } = useTournamentStore();
  const { initGame } = useGameStore();
  
  const [match, setMatch] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [board, setBoard] = useState(Array(GRID_SIZE * GRID_SIZE).fill(0));
  const [shipsPlaced, setShipsPlaced] = useState(false);
  const [selectedShip, setSelectedShip] = useState(null);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [placedShips, setPlacedShips] = useState([]);

  useEffect(() => {
    // Find the match from tournament bracket
    if (activeTournament?.currentBracket && matchId) {
      const foundMatch = activeTournament.currentBracket.find(m => m.id === matchId);
      
      if (foundMatch) {
        const oppId = foundMatch.player1_id === user?.id ? foundMatch.player2_id : foundMatch.player1_id;
        const oppData = foundMatch.player1_id === user?.id ? foundMatch.player2 : foundMatch.player1;
        
        setMatch(foundMatch);
        setOpponent(oppData);
        console.log('🎮 Tournament ship placement for:', foundMatch.bracket_position);
        
        // Initialize with random ship placement
        initializeRandomBoard();
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [matchId, activeTournament?.currentBracket, user?.id]);

  const initializeRandomBoard = () => {
    let newBoard = Array(GRID_SIZE * GRID_SIZE).fill(0);
    let ships = [];
    
    for (const shipType of SHIPS) {
      for (let i = 0; i < shipType.count; i++) {
        let placed = false;
        while (!placed) {
          const isHoriz = Math.random() > 0.5;
          const row = Math.floor(Math.random() * GRID_SIZE);
          const col = Math.floor(Math.random() * (GRID_SIZE - (isHoriz ? shipType.size : 0)));
          
          if (canPlaceShip(newBoard, row, col, shipType.size, isHoriz)) {
            for (let j = 0; j < shipType.size; j++) {
              const idx = isHoriz ? row * GRID_SIZE + col + j : (row + j) * GRID_SIZE + col;
              newBoard[idx] = 1;
            }
            ships.push({ type: shipType.name, size: shipType.size, row, col, horizontal: isHoriz });
            placed = true;
          }
        }
      }
    }
    
    setBoard(newBoard);
    setPlacedShips(ships);
  };

  const canPlaceShip = (currentBoard, row, col, size, isHorizontal) => {
    // Check bounds
    if (isHorizontal) {
      if (col + size > GRID_SIZE) return false;
      for (let j = 0; j < size; j++) {
        if (currentBoard[row * GRID_SIZE + col + j] !== 0) return false;
      }
    } else {
      if (row + size > GRID_SIZE) return false;
      for (let j = 0; j < size; j++) {
        if (currentBoard[(row + j) * GRID_SIZE + col] !== 0) return false;
      }
    }
    return true;
  };

  const handleCellClick = (index) => {
    // For now, just allow random placement with the button
  };

  const handlePlaceShips = async () => {
    if (!match || !opponent) return;
    
    console.log('🎮 Ships placed for tournament match');
    
    // Convert 1D board array to 2D board with proper CELL_STATES
    const board2D = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const boardRow = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const idx = row * GRID_SIZE + col;
        boardRow.push(board[idx] === 1 ? CELL_STATES.SHIP : CELL_STATES.EMPTY);
      }
      board2D.push(boardRow);
    }
    
    console.log('🎮 Converted board to 2D format, ship cells:', 
      board2D.flat().filter(cell => cell === CELL_STATES.SHIP).length);
    
    // Initialize game with tournament data
    initGame(matchId, user.id, opponent.id, user.user_metadata?.username || user.email, opponent.username);
    
    // Save ships to gameStore using setMyShips
    useGameStore.setState({
      matchId: matchId,
      myBoard: board2D,
      opponentBoard: Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill(CELL_STATES.EMPTY)
      ),
      myShips: placedShips,
      opponentId: opponent.id
    });
    
    console.log('🎮 Ships saved to gameStore');
    
    // Mark ships as placed in sessionStorage for this match
    sessionStorage.setItem(`ships_placed_${matchId}`, 'true');
    
    // Navigate to ready/waiting screen (not directly to gameplay)
    navigate(`/tournament-match/${matchId}`);
  };

  const handleBack = () => {
    if (activeTournament) {
      navigate(`/tournament/${activeTournament.id}`);
    } else {
      navigate('/tournaments');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!match || !opponent) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-400 mb-4">Match not found</p>
          <button onClick={handleBack} className="btn-primary">
            Back to Tournament
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      {/* Header */}
      <header className="bg-navy-800 border-b border-navy-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{match.bracket_position}</h1>
              <p className="text-gray-400">Ship Placement - Round {match.round}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left - Player Board */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Your Fleet</h2>
            <div className="bg-navy-800 rounded-lg p-6 border border-navy-700">
              {/* Grid */}
              <div className="inline-block bg-navy-900 p-2 rounded border border-blue-500/30">
                <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                  {board.map((cell, idx) => {
                    const row = Math.floor(idx / GRID_SIZE);
                    const col = idx % GRID_SIZE;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleCellClick(idx)}
                        className={`w-8 h-8 border border-gray-600 cursor-pointer transition-colors ${
                          cell === 1
                            ? 'bg-blue-500 hover:bg-blue-600'
                            : 'bg-navy-700 hover:bg-navy-600'
                        }`}
                        title={`${String.fromCharCode(65 + col)}${row + 1}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Ship Info */}
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold text-lg">Fleet Composition</h3>
                {SHIPS.map((ship) => (
                  <div key={ship.name} className="flex items-center justify-between p-3 bg-navy-700 rounded">
                    <div>
                      <p className="font-semibold">{ship.name}</p>
                      <p className="text-sm text-gray-400">Size: {ship.size}</p>
                    </div>
                    <p className="text-blue-400 font-bold">×{ship.count}</p>
                  </div>
                ))}
              </div>

              {/* Random Placement Button */}
              <button
                onClick={initializeRandomBoard}
                className="w-full mt-6 px-4 py-2 bg-navy-700 hover:bg-navy-600 border border-gray-600 rounded transition-colors flex items-center justify-center space-x-2"
              >
                <RotateCw className="w-4 h-4" />
                <span>Random Placement</span>
              </button>
            </div>
          </div>

          {/* Right - Info & Action */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Ready?</h2>
            <div className="bg-navy-800 rounded-lg border border-navy-700 p-6 space-y-6">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
                <Ship className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                <h3 className="text-xl font-bold mb-2">Fleet Deployed</h3>
                <p className="text-gray-300 mb-4">
                  Your ships are positioned and ready for battle against <span className="font-semibold text-blue-400">{opponent.username}</span>
                </p>
                
                <div className="bg-navy-800/50 rounded p-4 mb-4">
                  <p className="text-sm text-gray-400 mb-3">Ships Placed:</p>
                  <div className="space-y-2">
                    {placedShips.map((ship, idx) => (
                      <div key={idx} className="text-sm flex justify-between">
                        <span>{ship.type}</span>
                        <span className="text-blue-400">Positioned</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  Total Ships: {placedShips.length} / {SHIPS.reduce((sum, s) => sum + s.count, 0)}
                </p>
              </div>

              <button
                onClick={handlePlaceShips}
                className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center space-x-2"
              >
                <Ship className="w-5 h-5" />
                <span>Ready to Battle</span>
              </button>

              <div className="bg-navy-700/50 rounded p-4 text-sm text-gray-400">
                <p className="font-semibold mb-2">Battle Rules:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Turn-based combat</li>
                  <li>Call coordinates to attack</li>
                  <li>Winner advances to next round</li>
                  <li>Losers are eliminated</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentShipPlacement;
