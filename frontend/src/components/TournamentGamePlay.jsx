import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useTournamentStore from '../stores/tournamentStore';
import useGameStore from '../stores/gameStore';
import LoadingSpinner from './LoadingSpinner';
import GameBoard from './GameBoard';
import FleetStatus from './FleetStatus';
import GameResultModal from './GameResultModal';
import TournamentWinner from './TournamentWinner';
import { BOARD_SIZE, CELL_STATES } from '../utils/gameConstants';
import { ArrowLeft, Ship, Loader } from 'lucide-react';
import { supabase } from '../services/supabase';

const TournamentGamePlay = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();

  const { activeTournament } = useTournamentStore();
  // Access boards and methods from gameStore using Zustand hooks
  const myBoard = useGameStore((state) => state.myBoard);
  const opponentBoard = useGameStore((state) => state.opponentBoard);
  const gameStatus = useGameStore((state) => state.status);
  const gameWinner = useGameStore((state) => state.winner);
  const initTournamentGame = useGameStore((state) => state.initTournamentGame);
  const makeAttack = useGameStore((state) => state.makeAttack);
  
  const [match, setMatch] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [boardState, setBoardState] = useState(0); // Force re-render on attack
  const [readyFlagsReset, setReadyFlagsReset] = useState(false); // Track if flags have been reset
  const [showGameResult, setShowGameResult] = useState(false);
  const [gameResult, setGameResult] = useState(null); // { isWinner: boolean }
  const [isCompletingMatch, setIsCompletingMatch] = useState(false); // Prevent duplicate completeMatch calls
  const [showShipPlacement, setShowShipPlacement] = useState(true); // Show ship placement UI
  const [placedShips, setPlacedShips] = useState([]); // Track placed ships
  const [showTournamentWinner, setShowTournamentWinner] = useState(false); // Show winner announcement
  const [tournamentWinnerData, setTournamentWinnerData] = useState(null); // Data for winner screen

  useEffect(() => {
    if (!activeTournament?.currentBracket || !matchId || !user) {
      setIsLoading(false);
      return;
    }

    // Find the match
    const foundMatch = activeTournament.currentBracket.find(m => m.id === matchId);
    if (!foundMatch) {
      console.error('🎮 Match not found:', matchId);
      setIsLoading(false);
      return;
    }

    const oppData = foundMatch.player1_id === user?.id ? foundMatch.player2 : foundMatch.player1;
    
    if (!oppData) {
      console.error('🎮 Opponent not found in match');
      setIsLoading(false);
      return;
    }

    setMatch(foundMatch);
    setOpponent(oppData);

    console.log('🎮 Tournament game starting:', foundMatch.bracket_position);
    console.log('🎮 User:', user.id, 'vs Opponent:', oppData.id);

    // Check if ships were already placed in gameStore (from waiting room)
    const gameState = useGameStore.getState();
    if (gameState.myBoard && gameState.opponentBoard && gameState.matchId === matchId) {
      console.log('🎮 Ships already placed in gameStore, initializing game boards');
      setShowShipPlacement(false);
      
      // Extract ships from the board
      const ships = [];
      for (let row = 0; row < gameState.myBoard.length; row++) {
        for (let col = 0; col < gameState.myBoard[row].length; col++) {
          if (gameState.myBoard[row][col] === 'ship') {
            ships.push({ row, col });
          }
        }
      }
      
      setPlacedShips(ships);
      setPlayerReady(true);
      setOpponentReady(false);
      setGameInitialized(true); // Mark game as initialized since boards are already loaded
      console.log('🎮 Boards loaded from gameStore, player marked as ready, game initialized');
    } else {
      console.log('🎮 No ships in gameStore, showing ship placement UI');
    }

    setIsLoading(false);
  }, [matchId, activeTournament?.currentBracket, user?.id]);

  // Handle ship placement confirmation
  const handleShipsPlaced = (ships) => {
    console.log('🎮 Ships placed:', ships);
    setPlacedShips(ships);
    setShowShipPlacement(false);
    
    // Initialize game boards with placed ships
    if (opponent) {
      initializeGameBoards(opponent, ships);
    }
    
    // Mark player as ready
    setPlayerReady(true);
  };

  // Start game immediately when player is ready (both players navigated from waiting room where both were ready)
  useEffect(() => {
    if (!match || !playerReady || gameStarted) {
      console.log('🎮 Skipping game start - match:', !!match, 'playerReady:', playerReady, 'gameStarted:', gameStarted);
      return;
    }

    console.log('🎮 Starting game immediately (both players were ready in waiting room)');
    console.log('🎮 Match ID:', matchId);
    console.log('🎮 Player is:', match.player1_id === user?.id ? 'Player 1' : 'Player 2');
    
    // Both players confirmed ready in waiting room before navigating here
    // No need to poll - just start the game
    setOpponentReady(true);
    setGameStarted(true);
    
    // Player 1 goes first
    const isPlayer1 = match.player1_id === user?.id;
    setIsMyTurn(isPlayer1);
    
    console.log('🎮 Game started! Your turn:', isPlayer1);
  }, [match, playerReady, gameStarted, matchId, user?.id]);

  // Setup realtime subscription for match status and opponent ready state
  useEffect(() => {
    if (!matchId || !user) return;

    console.log('🎮 Setting up match subscription for:', matchId);

    const subscription = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          console.log('🎮 Match status updated:', payload);
          const updatedMatch = payload.new;
          
          // Check if both players are ready (if columns exist)
          if (updatedMatch.player1_ready !== undefined && updatedMatch.player2_ready !== undefined) {
            if (updatedMatch.player1_ready && updatedMatch.player2_ready) {
              console.log('🎮 Both players ready! Starting game.');
              setGameStarted(true);
              
              // Determine who goes first (based on player order or random)
              const isPlayer1 = updatedMatch.player1_id === user.id;
              setIsMyTurn(isPlayer1); // Player 1 goes first
            }
          } else {
            console.log('🎮 Ready columns not found in database update');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🎮 Unsubscribing from match:', matchId);
      subscription.unsubscribe();
    };
  }, [matchId, user?.id]);

  // Listen for opponent's moves and process attacks in real-time
  useEffect(() => {
    if (!matchId || !user || !gameStarted) return;

    console.log('🎮 Setting up moves listener for match:', matchId);
    console.log('🎮 User ID:', user.id);

    const movesChannel = supabase
      .channel(`moves:${matchId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: user.id }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tournament_moves',
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          console.log('🎮 ✨ New move received:', payload.new);
          const move = payload.new;

          // Ignore our own moves
          if (move.player_id === user.id) {
            console.log('🎮 Ignoring own move');
            return;
          }

          // This is opponent's move attacking MY board
          console.log('🎮 🎯 Opponent attacked at:', move.x, move.y);
          
          // Check my actual board to determine if it's a hit
          const myCurrentBoard = useGameStore.getState().myBoard;
          const cellState = myCurrentBoard?.[move.y]?.[move.x];
          const actualResult = cellState === CELL_STATES.SHIP ? 'hit' : 'miss';
          
          console.log(`🎮 ${actualResult === 'hit' ? '✅ HIT' : '❌ MISS'}! Opponent ${actualResult === 'hit' ? 'hit' : 'missed'} at ${move.x} ${move.y}`);
          
          // Update MY board to show the attack
          const newMyBoard = myCurrentBoard.map(row => [...row]);
          newMyBoard[move.y][move.x] = actualResult === 'hit' ? CELL_STATES.HIT : CELL_STATES.MISS;
          
          // Count remaining ship cells on MY board
          let myRemainingShipCells = 0;
          newMyBoard.forEach(row => {
            row.forEach(cell => {
              if (cell === CELL_STATES.SHIP) myRemainingShipCells++;
            });
          });
          
          console.log('🎮 My remaining ship cells:', myRemainingShipCells);
          
          // Update the board in store
          useGameStore.setState({ myBoard: newMyBoard });
          
          // Update move result in database if needed (defender confirms)
          if (actualResult === 'hit' && move.result === 'miss') {
            console.log('🎮 Updating move result in database to: hit');
            try {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              
              await fetch(`${supabaseUrl}/rest/v1/tournament_moves?id=eq.${move.id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseAnonKey,
                  'Authorization': `Bearer ${session?.access_token}`,
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ result: 'hit' })
              });
              console.log('🎮 ✅ Move result updated to HIT in database');
            } catch (error) {
              console.error('🎮 ❌ Failed to update move result:', error);
            }
          } else if (actualResult === 'miss' && move.result === 'miss') {
            console.log('🎮 Updating move result in database to: miss');
            try {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              
              await fetch(`${supabaseUrl}/rest/v1/tournament_moves?id=eq.${move.id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseAnonKey,
                  'Authorization': `Bearer ${session?.access_token}`,
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ result: 'miss' })
              });
              console.log('🎮 ✅ Move result updated to MISS in database');
            } catch (error) {
              console.error('🎮 ❌ Failed to update move result:', error);
            }
          }
          
          // Check if I lost (all my ships destroyed)
          if (myRemainingShipCells === 0) {
            console.log('🎮 💀 ALL MY SHIPS DESTROYED - I LOST!');
            console.log('🏆 Showing result screen...');
            
            // Show result modal with opponent as winner
            setGameResult({ isWinner: false, winnerId: move.player_id });
            setShowGameResult(true);
            return;
          }
          
          // If hit, opponent gets another turn; if miss, my turn
          if (actualResult === 'hit') {
            console.log('🎮 🔄 Opponent scored a HIT - they will get another turn via UPDATE event');
            setIsMyTurn(false);
          } else {
            console.log('🎮 🔄 Turn switched - now my turn after opponent miss');
            setIsMyTurn(true);
          }

          // Force board re-render
          setBoardState(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournament_moves',
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          console.log('🎮 ✨ Move updated:', payload.new);
          const move = payload.new;
          
          // If this is opponent's move update, ignore
          if (move.player_id !== user.id) {
            console.log('🎮 Ignoring opponent move update');
            return;
          }
          
          // This is MY move result being confirmed by opponent
          console.log('🎮 📥 Received result for my attack at', move.x, move.y, ':', move.result);
          
          // Update opponent board with the confirmed result
          const opponentCurrentBoard = useGameStore.getState().opponentBoard;
          const newOpponentBoard = opponentCurrentBoard.map(row => [...row]);
          newOpponentBoard[move.y][move.x] = move.result === 'hit' ? CELL_STATES.HIT : CELL_STATES.MISS;
          
          if (move.result === 'hit') {
            console.log('🎮 💥 HIT confirmed! Updated opponent board');
            
            // Count opponent's destroyed ships
            let opponentHitCells = 0;
            newOpponentBoard.forEach(row => {
              row.forEach(cell => {
                if (cell === CELL_STATES.HIT) opponentHitCells++;
              });
            });
            
            const opponentRemainingShipCells = 18 - opponentHitCells;
            console.log('🎮 Opponent ship cells destroyed:', opponentHitCells, '/ 18');
            console.log('🎮 Opponent remaining ship cells:', opponentRemainingShipCells);
            
            // Update store
            useGameStore.setState({ opponentBoard: newOpponentBoard });
            
            // Check if opponent has no ships left (I won!)
            if (opponentRemainingShipCells === 0) {
              console.log('🎮 🏆 VICTORY! Opponent destroyed all their ships!');
              console.log('🏆 Showing result screen...');
              
              // Show result modal with me as winner
              setGameResult({ isWinner: true, winnerId: user.id });
              setShowGameResult(true);
              return;
            }
            
            // On hit, I get another turn
            console.log('🎮 🔥 HIT! You get another turn!');
            setIsMyTurn(true);
          } else {
            console.log('🎮 💨 MISS confirmed! Updated opponent board');
            useGameStore.setState({ opponentBoard: newOpponentBoard });
            
            // On miss, turn switches to opponent
            console.log('🎮 🔄 MISS - Turn switches to opponent');
            setIsMyTurn(false);
          }
          
          // Force board re-render
          setBoardState(prev => prev + 1);
        }
      )
      .subscribe((status) => {
        console.log('🎮 📡 Moves channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('🎮 ✅ Successfully subscribed to moves channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('🎮 ❌ Failed to subscribe to moves channel');
        }
      });

    return () => {
      console.log('🎮 Unsubscribing from moves');
      movesChannel.unsubscribe();
    };
  }, [matchId, user?.id, gameStarted, session, navigate]);

  // Debug: Log board states to console (MUST be before any returns)
  useEffect(() => {
    if (gameStarted && myBoard && opponentBoard) {
      console.log('🎮 Board state check:');
      console.log('🎮 myBoard:', myBoard?.length, 'rows');
      console.log('🎮 myBoard sample (first row):', myBoard?.[0]);
      console.log('🎮 opponentBoard:', opponentBoard?.length, 'rows');
      
      // Count ships on myBoard
      let shipCount = 0;
      let hitCount = 0;
      if (myBoard) {
        myBoard.forEach(row => {
          row.forEach(cell => {
            if (cell === CELL_STATES.SHIP) shipCount++;
            if (cell === CELL_STATES.HIT) hitCount++;
          });
        });
      }
      console.log('🎮 Total ship cells on myBoard:', shipCount);
      console.log('🎮 Total hit cells on myBoard:', hitCount);
      
      // Count hits on opponentBoard
      let oppHitCount = 0;
      if (opponentBoard) {
        opponentBoard.forEach(row => {
          row.forEach(cell => {
            if (cell === CELL_STATES.HIT) oppHitCount++;
          });
        });
      }
      console.log('🎮 Total hit cells on opponentBoard:', oppHitCount);
    }
  }, [gameStarted, myBoard, opponentBoard, boardState]);

  const initializeGameBoards = (opponentData, ships = null) => {
    try {
      if (!opponentData) {
        console.error('🎮 No opponent data provided');
        return;
      }

      console.log('🎮 Starting board initialization with opponent:', opponentData.id);

      // Create empty boards
      const myBoard = Array(BOARD_SIZE).fill(null).map(() => 
        Array(BOARD_SIZE).fill(CELL_STATES.EMPTY)
      );
      const opponentBoard = Array(BOARD_SIZE).fill(null).map(() => 
        Array(BOARD_SIZE).fill(CELL_STATES.EMPTY)
      );

      console.log('🎮 Empty boards created');

      // Use provided ships or place random ships on my board
      const myShips = ships || placeRandomShips();
      console.log('🎮 Ships placed:', myShips.length);

      myShips.forEach((ship, idx) => {
        for (let i = 0; i < ship.size; i++) {
          if (ship.horizontal) {
            myBoard[ship.row][ship.col + i] = CELL_STATES.SHIP;
          } else {
            myBoard[ship.row + i][ship.col] = CELL_STATES.SHIP;
          }
        }
      });

      console.log('🎮 Ships marked on board');

      // Set game state in store
      const gameData = {
        matchId,
        myBoard,
        opponentBoard,
        myShips,
        opponentId: opponentData.id,
      };

      console.log('🎮 Calling initTournamentGame with:', {
        matchId,
        myBoardRows: myBoard.length,
        opponentBoardRows: opponentBoard.length,
        shipsCount: myShips.length,
        opponentId: opponentData.id,
      });

      initTournamentGame(gameData);

      console.log('🎮 Game boards initialized');
      setGameInitialized(true);
    } catch (error) {
      console.error('🎮 Error initializing game:', error);
      console.error('🎮 Stack trace:', error.stack);
      setGameInitialized(false);
    }
  };

  const placeRandomShips = () => {
    const ships = [
      { name: 'Battleship', size: 4 },
      { name: 'Cruiser', size: 3 },
      { name: 'Cruiser', size: 3 },
      { name: 'Destroyer', size: 2 },
      { name: 'Destroyer', size: 2 },
      { name: 'Submarine', size: 1 },
      { name: 'Submarine', size: 1 },
      { name: 'Submarine', size: 1 },
      { name: 'Submarine', size: 1 },
    ];

    const placedShips = [];
    const occupied = Array(BOARD_SIZE).fill(null).map(() => 
      Array(BOARD_SIZE).fill(false)
    );

    for (const shipType of ships) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 50) {
        const horizontal = Math.random() > 0.5;
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);

        if (canPlaceShip(occupied, row, col, shipType.size, horizontal)) {
          // Mark cells as occupied
          for (let i = 0; i < shipType.size; i++) {
            if (horizontal) {
              occupied[row][col + i] = true;
            } else {
              occupied[row + i][col] = true;
            }
          }

          placedShips.push({
            name: shipType.name,
            size: shipType.size,
            row,
            col,
            horizontal,
          });

          placed = true;
        }
        attempts++;
      }
    }

    return placedShips;
  };

  const canPlaceShip = (occupied, row, col, size, horizontal) => {
    if (horizontal) {
      if (col + size > BOARD_SIZE) return false;
      for (let i = 0; i < size; i++) {
        if (occupied[row][col + i]) return false;
      }
    } else {
      if (row + size > BOARD_SIZE) return false;
      for (let i = 0; i < size; i++) {
        if (occupied[row + i][col]) return false;
      }
    }
    return true;
  };

  const handleAttack = async (x, y) => {
    if (!isMyTurn || !gameInitialized) {
      console.log('🎮 Cannot attack - not your turn or game not initialized');
      return;
    }

    console.log('🎮 Attack at:', x, y);
    console.log('🎮 💫 Sending attack - waiting for opponent to validate...');

    try {
      // Mark the cell as "pending" visually
      const opponentCurrentBoard = useGameStore.getState().opponentBoard;
      if (opponentCurrentBoard[y][x] !== CELL_STATES.EMPTY) {
        console.log('🎮 Cell already attacked!');
        return;
      }

      // Save attack coordinates to database (result to be determined by opponent)
      console.log('🎮 Saving attack coordinates to database (result to be determined by opponent)...');
      
      // Use cached session instead of calling getSession() which hangs
      if (!session?.access_token) {
        console.error('🎮 ❌ No session or access token - cannot save move');
        console.error('🎮 Session state:', session);
        return;
      }
      
      console.log('🎮 Using session from auth store for REST API call');
      
      // Use direct REST API instead of Supabase client to avoid hanging
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const moveData = {
        match_id: matchId,
        player_id: user.id,
        x: x,
        y: y,
        result: 'miss', // Defender will update to 'hit' if needed
        ship_sunk: null
      };
      
      console.log('🎮 Sending attack coordinates via REST API:', moveData);
      
      try {
        // Use access token from auth store session
        const headers = {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Prefer': 'return=minimal'
        };
        
        console.log('🎮 Using authenticated request with access token from auth store');
        
        const fetchResponse = await Promise.race([
          fetch(`${supabaseUrl}/rest/v1/tournament_moves`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(moveData)
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 3000)
          )
        ]);
        
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('🎮 ❌ REST API insert failed:', fetchResponse.status, errorText);
          console.error('🎮 ⚠️ Attack failed - database insert failed');
          return;
        }
        
        console.log('🎮 ✅ Attack coordinates saved successfully');
        console.log('🎮 ⏳ Waiting for opponent to validate result...');
        
        // Turn will be managed by the UPDATE event when opponent confirms result
        // If hit, I keep turn; if miss, opponent gets turn
      } catch (error) {
        console.error('🎮 ❌ Database insert TIMED OUT or failed:', error.message);
        console.error('🎮 ⚠️ Attack failed - cannot confirm move was saved');
        return;
      }
    } catch (error) {
      console.error('🎮 Error processing attack:', error);
    }
  };

  const handleReady = async () => {
    if (!match || !user || playerReady) return;

    try {
      console.log('🎮 Player marking as ready');
      setPlayerReady(true);

      // Update match status in database
      const isPlayer1 = match.player1_id === user.id;
      const updateData = isPlayer1 
        ? { player1_ready: true }
        : { player2_ready: true };

      console.log('🎮 Attempting update with:', updateData);
      console.log('🎮 Is Player 1?', isPlayer1);
      console.log('🎮 Match ID:', matchId);

      const { error: updateError } = await supabase
        .from('tournament_matches')
        .update(updateData)
        .eq('id', matchId);

      console.log('🎮 Update response - error:', updateError);
      
      const error = updateError;
      const data = null; // We don't need the data back

      if (error) {
        console.error('🎮 Database error marking ready:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        console.error('🎮 Full error object:', error);
        setPlayerReady(false);
        
        // Check if columns exist
        if (error.message?.includes('column') || error.code === '42703') {
          console.error('🎮 ISSUE: Ready status columns may not exist in database');
          console.error('🎮 ACTION: Apply the database migration in Supabase SQL Editor');
        }
      } else {
        console.log('🎮 Successfully marked as ready');
        console.log('🎮 Updated data:', data);
      }
    } catch (error) {
      console.error('🎮 Error in handleReady:', error);
      console.error('🎮 Error stack:', error.stack);
      setPlayerReady(false);
    }
  };

  const resetReadyFlags = async () => {
    if (!matchId) {
      console.log('🎮 No matchId, skipping reset');
      return;
    }
    
    try {
      console.log('🎮 Resetting ready flags for match:', matchId);
      
      const { error } = await supabase
        .from('tournament_matches')
        .update({ 
          player1_ready: false,
          player2_ready: false 
        })
        .eq('id', matchId);
      
      const data = null; // Don't need data back

      if (error) {
        console.error('🎮 Error resetting ready flags:', error.message);
        console.error('🎮 Error code:', error.code);
        console.error('🎮 Error details:', error.details);
        
        if (error.code === '42703' || error.message?.includes('column')) {
          console.error('🎮 ⚠️ COLUMNS DON\'T EXIST - Need to run migration!');
          throw new Error('Columns player1_ready/player2_ready do not exist');
        }
      } else {
        console.log('🎮 Ready flags reset successfully');
        console.log('🎮 Reset result:', data);
      }
    } catch (error) {
      console.error('🎮 Exception resetting ready flags:', error.message);
      throw error; // Re-throw so caller knows it failed
    }
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

  if (!match || !opponent || !gameInitialized) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-400 mb-4">
            {!gameInitialized ? 'Initializing game...' : 'Match not found'}
          </p>
          <button onClick={handleBack} className="btn-primary">
            Back to Tournament
          </button>
        </div>
      </div>
    );
  }

  // Show ship placement screen first
  if (showShipPlacement) {
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
                <h1 className="text-2xl font-bold">{match?.bracket_position || 'Tournament Match'}</h1>
                <p className="text-gray-400">Place Your Ships</p>
              </div>
            </div>
          </div>
        </header>

        {/* Ship Placement Screen */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-navy-800 rounded-lg border border-navy-700 p-8">
              <div className="text-center mb-8">
                <Ship className="w-12 h-12 mx-auto text-blue-400 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Position Your Fleet</h2>
                <p className="text-gray-400">
                  Place your ships strategically on the board
                </p>
              </div>

              <div className="bg-navy-700/50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold mb-4 text-center">Your Fleet</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-navy-800 p-3 rounded">
                    <p className="font-semibold">1x Battleship</p>
                    <p className="text-gray-400">4 cells</p>
                  </div>
                  <div className="bg-navy-800 p-3 rounded">
                    <p className="font-semibold">2x Cruiser</p>
                    <p className="text-gray-400">3 cells each</p>
                  </div>
                  <div className="bg-navy-800 p-3 rounded">
                    <p className="font-semibold">2x Destroyer</p>
                    <p className="text-gray-400">2 cells each</p>
                  </div>
                  <div className="bg-navy-800 p-3 rounded md:col-span-3">
                    <p className="font-semibold">4x Submarine</p>
                    <p className="text-gray-400">1 cell each</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    const ships = placeRandomShips();
                    handleShipsPlaced(ships);
                  }}
                  className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Auto-Place Ships
                </button>
              </div>

              <p className="text-sm text-gray-500 text-center mt-6">
                Ships will be placed randomly. Manual placement coming soon!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show waiting/ready screen if game hasn't started yet
  if (!gameStarted) {
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
                <p className="text-gray-400">vs {opponent.username}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Waiting Screen */}
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="max-w-2xl w-full">
            <div className="bg-navy-800 rounded-lg border border-navy-700 p-12 text-center space-y-8">
              <Ship className="w-16 h-16 mx-auto text-blue-400" />
              
              <div>
                <h2 className="text-3xl font-bold mb-2">Ready to Battle?</h2>
                <p className="text-gray-400">
                  Both players must confirm they're ready before the battle begins
                </p>
              </div>

              <div className="bg-navy-700/50 rounded-lg p-6 space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <p className="font-semibold">You</p>
                    <p className="text-sm text-gray-400">Fleet placed and ready</p>
                  </div>
                  <div className={`px-4 py-2 rounded font-semibold ${
                    playerReady ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                  }`}>
                    {playerReady ? '✓ Ready' : 'Waiting...'}
                  </div>
                </div>

                <div className="h-px bg-gray-600"></div>

                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <p className="font-semibold">{opponent.username}</p>
                    <p className="text-sm text-gray-400">Fleet placed and ready</p>
                  </div>
                  <div className={`px-4 py-2 rounded font-semibold flex items-center space-x-2 ${
                    opponentReady ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {opponentReady ? (
                      <>
                        <span>✓ Ready</span>
                      </>
                    ) : (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Waiting...</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleReady}
                disabled={playerReady}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                  playerReady
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {playerReady ? '✓ You Are Ready' : 'Ready to Battle'}
              </button>

              <p className="text-sm text-gray-500">
                Once both players are ready, the battle will begin immediately
              </p>

              {playerReady && !gameStarted && (
                <div className="bg-blue-900/30 border border-blue-500/50 rounded p-4 text-sm">
                  <p className="text-blue-300">
                    ⏳ Waiting for {opponent.username} to mark ready...
                  </p>
                  <p className="text-blue-200 text-xs mt-2">
                    If this takes too long, the opponent may not have clicked their ready button yet.
                  </p>
                </div>
              )}
            </div>
          </div>
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
              <p className="text-gray-400">vs {opponent.username}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Game Area */}
      <div className="container mx-auto px-4 py-8">
        {/* Safety check for boards */}
        {!myBoard || !opponentBoard ? (
          <div className="text-center text-gray-400">
            <LoadingSpinner />
            <p className="mt-4">Loading game boards...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Your Board Section */}
              <div className="space-y-4">
                <GameBoard
                  board={myBoard}
                  title="Your Fleet"
                  isMyBoard={true}
                  showShips={true}
                  disabled={false}
                />
                <FleetStatus 
                  board={myBoard} 
                  title="Your Fleet Status" 
                  isMyBoard={true} 
                />
              </div>

              {/* Opponent Board Section */}
              <div className="space-y-4">
                <GameBoard
                  board={opponentBoard}
                  title={`${opponent.username}'s Fleet`}
                  isOpponentBoard={true}
                  isMyTurn={isMyTurn}
                  onCellClick={handleAttack}
                  disabled={!isMyTurn}
                />
                <FleetStatus 
                  board={opponentBoard} 
                  title={`${opponent.username}'s Fleet Status`} 
                  isMyBoard={false} 
                />
              </div>
            </div>

            {/* Game Status */}
            <div className="mt-8 text-center">
              <p className="text-gray-400">Tournament Match • Round {match.round}</p>
              <p className="text-sm text-gray-500 mt-2">
                {isMyTurn ? '🎯 Your turn - Select a target' : '⏳ Waiting for opponent...'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Game Result Modal */}
      {showGameResult && gameResult && (
        <GameResultModal
          isWinner={gameResult.isWinner}
          myBoard={myBoard}
          opponentBoard={opponentBoard}
          isLoading={isCompletingMatch}
          onClose={async () => {
            // Prevent duplicate calls
            if (isCompletingMatch) {
              console.log('🏆 Already completing match, ignoring duplicate call');
              return;
            }

            console.log('🏆 Modal closed - completing match and navigating...');
            setIsCompletingMatch(true);
            
            // CRITICAL: Unsubscribe from all realtime channels first to avoid conflicts
            console.log('🏆 Cleaning up realtime subscriptions before completing match...');
            try {
              const channelsToRemove = supabase.getChannels();
              console.log('🏆 Found', channelsToRemove.length, 'active channels, removing all...');
              await Promise.all(channelsToRemove.map(channel => supabase.removeChannel(channel)));
              console.log('🏆 ✅ All channels cleaned up');
              
              // Wait a bit longer to ensure connection pool is fully released
              console.log('🏆 Waiting for connection pool to stabilize...');
              await new Promise(resolve => setTimeout(resolve, 500));
              console.log('🏆 ✅ Connection pool stabilized');
            } catch (cleanupError) {
              console.warn('🏆 ⚠️ Channel cleanup had issues (non-critical):', cleanupError);
            }
            
            // CRITICAL FIX: Complete match BEFORE navigating to prevent fetch cancellation
            console.log('🏆 Starting match completion process...');
            
            try {
              const backendUrl = import.meta.env.VITE_BACKEND_URL;
              console.log('🏆 Backend URL:', backendUrl);
              console.log('🏆 Calling backend API to complete match...');
              console.log('🏆 Match ID:', matchId);
              console.log('🏆 Winner ID:', gameResult.winnerId);
              
              // CRITICAL FIX: Use session from auth hook instead of fetching again
              // The supabase.auth.getSession() call hangs after unsubscribing from channels
              console.log('🏆 Using session from auth hook...');
              console.log('🏆 Session available:', session ? 'YES' : 'NO');
              console.log('🏆 User ID:', user?.id);
              console.log('🏆 Session object keys:', session ? Object.keys(session).join(', ') : 'N/A');
              console.log('🏆 Session has access_token:', !!session?.access_token);
              
              if (session?.access_token) {
                const tokenPreview = session.access_token.substring(0, 20);
                console.log('🏆 Access token preview:', tokenPreview + '...');
                console.log('🏆 Access token length:', session.access_token.length);
              }
              
              if (!session || !session.access_token) {
                console.error('🏆 ❌ No session or access token - cannot complete match');
                console.error('🏆 ❌ Session type:', typeof session);
                console.error('🏆 ❌ Session is null:', session === null);
                console.error('🏆 ❌ Session is undefined:', session === undefined);
                console.error('🏆 ❌ Session stringified:', JSON.stringify(session, null, 2));
                throw new Error('No authentication session or access token');
              }
              
              console.log('🏆 ✅ Session validated - proceeding with API call');
              
              const apiUrl = `${backendUrl}/api/game?action=completeTournamentMatch`;
              console.log('🏆 Full API URL:', apiUrl);
              
              const requestBody = {
                matchId: matchId,
                winnerId: gameResult.winnerId
              };
              console.log('🏆 Request body:', JSON.stringify(requestBody));
              
              // Add timeout to prevent hanging forever
              const controller = new AbortController();
              const timeoutId = setTimeout(() => {
                console.error('🏆 ❌ Request timeout after 30 seconds - aborting');
                controller.abort();
              }, 30000); // 30 second timeout
              
              console.log('🏆 Creating fetch request with timeout...');
              console.log('🏆 Fetch config:', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer [REDACTED]'
                },
                hasBody: !!requestBody,
                hasSignal: !!controller.signal
              });
              
              console.log('🏆 Sending fetch request NOW...');
              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
                // Add keepalive to survive page navigation
                keepalive: true
              });
              
              clearTimeout(timeoutId);
              console.log('🏆 Response received!');
              console.log('🏆 Response status:', response.status);
              console.log('🏆 Response ok:', response.ok);

              if (!response.ok) {
                const errorText = await response.text();
                console.error('🏆 ❌ Error response:', errorText);
                throw new Error(errorText || 'Failed to complete match');
              }

              const result = await response.json();
              console.log('🏆 ✅ Match completed via backend:', result);

              // NOTE: Don't refresh tournament details here - it causes the fetch to hang
              // after we cleaned up realtime channels. The TournamentDetails page will
              // automatically fetch fresh data when it loads.

              // Check if this was a finals match (round === totalRounds)
              console.log('🏆 Checking if this was finals...');
              if (match) {
                const totalRounds = Math.log2(activeTournament?.max_players || 2);
                console.log('🏆 Current match round:', match.round, 'Total rounds:', totalRounds);
                
                if (match.round === totalRounds && gameResult.isWinner) {
                  console.log('🏆 🏆 FINALS COMPLETED! Showing tournament winner screen...');
                  // Show tournament winner screen instead of navigating immediately
                  setTournamentWinnerData({
                    winnerId: gameResult.winnerId,
                    winnerName: user?.username || 'Champion',
                    tournamentName: activeTournament?.title || 'Tournament',
                    isCurrentUser: true
                  });
                  setShowTournamentWinner(true);
                  setIsCompletingMatch(false);
                  setShowGameResult(false);
                  return; // Don't navigate yet - let the winner screen handle navigation
                }
              }
              
              console.log('🏆 ✅ Match completion successful, now navigating...');
            } catch (error) {
              console.error('🏆 ❌ Error completing match - CAUGHT EXCEPTION:');
              console.error('🏆 ❌ Error object:', error);
              console.error('🏆 ❌ Error message:', error?.message);
              console.error('🏆 ❌ Error name:', error?.name);
              console.error('🏆 ❌ Error stack:', error?.stack);
              console.error('🏆 ❌ Error toString:', error?.toString());
              
              if (error?.name === 'AbortError') {
                console.error('🏆 ❌ Request was aborted due to timeout');
              } else if (error?.name === 'TypeError') {
                console.error('🏆 ❌ Network error or CORS issue');
              } else if (error instanceof Error) {
                console.error('🏆 ❌ Standard Error instance');
              } else {
                console.error('🏆 ❌ Unknown error type:', typeof error);
              }
              
              console.warn('🏆 ⚠️ Match completion failed - navigating anyway, please refresh page to see updated bracket');
            }
            
            // Navigate AFTER completing match
            console.log('🏆 Navigating to tournament page...');
            navigate(`/tournament/${activeTournament.id}`);
            setIsCompletingMatch(false);
            setShowGameResult(false);
          }}
        />
      )}

      {/* Tournament Winner Screen */}
      {showTournamentWinner && tournamentWinnerData && (
        <TournamentWinner
          winnerId={tournamentWinnerData.winnerId}
          winnerName={tournamentWinnerData.winnerName}
          tournamentName={tournamentWinnerData.tournamentName}
          isCurrentUser={tournamentWinnerData.isCurrentUser}
          onClose={() => {
            console.log('🏆 Tournament winner screen closed, navigating back to tournament...');
            setShowTournamentWinner(false);
            navigate(`/tournament/${activeTournament.id}`);
          }}
        />
      )}
    </div>
  );
};


export default TournamentGamePlay;
