import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useTournamentStore from '../stores/tournamentStore';
import useGameStore from '../stores/gameStore';
import LoadingSpinner from './LoadingSpinner';
import { Swords, User, Trophy, MapPin, ArrowLeft, Clock, Check, Ship } from 'lucide-react';
import { supabase } from '../services/supabase';

const TournamentMatchWaiting = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth(); // Get session for auth token
  
  const { currentMatch, activeTournament, fetchBracket } = useTournamentStore();
  const { createTournamentGame } = useGameStore();
  
  // Check sessionStorage IMMEDIATELY before first render
  const initialShipsPlaced = matchId ? sessionStorage.getItem(`ships_placed_${matchId}`) === 'true' : false;
  
  const [match, setMatch] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [hasPlacedShips, setHasPlacedShips] = useState(initialShipsPlaced); // Initialize from sessionStorage
  const [readyFlagsReset, setReadyFlagsReset] = useState(false);
  const navigationTriggered = useRef(false);
  const manuallyMarkedReady = useRef(false); // Track if user clicked "Mark Ready"

  useEffect(() => {
    // Find the match details from the bracket
    if (activeTournament?.currentBracket && matchId && user) {
      console.log('🏆 Looking for match:', matchId);
      console.log('🏆 Available matches:', activeTournament.currentBracket.length);
      
      const foundMatch = activeTournament.currentBracket.find(m => m.id === matchId);
      console.log('🏆 Found match:', foundMatch ? 'YES' : 'NO');
      
      if (foundMatch) {
        // Check if match is already completed - redirect back to tournament
        if (foundMatch.status === 'completed') {
          console.log('🏆 ⚠️ Match is already completed, redirecting to tournament page');
          navigate(`/tournament/${activeTournament.id}`, { replace: true });
          return;
        }
        
        // Log player mapping for debugging
        console.log('🏆 Match player mapping:', {
          matchId: foundMatch.id,
          player1_id: foundMatch.player1_id?.substring(0, 8),
          player2_id: foundMatch.player2_id?.substring(0, 8),
          myUserId: user?.id?.substring(0, 8),
          iAmPlayer: foundMatch.player1_id === user?.id ? 'Player 1' : 'Player 2'
        });
        
        const oppId = foundMatch.player1_id === user?.id ? foundMatch.player2_id : foundMatch.player1_id;
        const oppData = foundMatch.player1_id === user?.id ? foundMatch.player2 : foundMatch.player1;
        
        setMatch(foundMatch);
        setOpponent(oppData);
        console.log('🏆 Match and opponent set:', foundMatch.bracket_position);
        
        // Reset ready flags ONLY ONCE per match (use database state, not sessionStorage)
        // This prevents Player 2 from resetting Player 1's ready flag
        // IMPORTANT: For "ready" status matches, ALWAYS reset flags to ensure fresh start
        const resetReadyFlags = async () => {
          try {
            // Check current match state
            const { data: matchData, error: checkError } = await supabase
              .from('tournament_matches')
              .select('ready_flags_initialized, status, player1_ready, player2_ready')
              .eq('id', matchId)
              .single();
            
            if (checkError) {
              console.error('🏆 ❌ Error checking ready flags state:', checkError);
              return;
            }
            
            console.log('🏆 Current match state:', {
              status: matchData?.status,
              ready_flags_initialized: matchData?.ready_flags_initialized,
              player1_ready: matchData?.player1_ready,
              player2_ready: matchData?.player2_ready
            });
            
            // Key insight: If match status is "ready", both players should start from scratch
            // This handles fresh matches AND players returning after leaving
            if (matchData?.status === 'ready') {
              // For ready status matches, check if we need to reset
              if (matchData?.ready_flags_initialized === true) {
                console.log('🏆 Match is in ready status but flags already initialized - checking if reset needed');
                
                // If both players are false, flags were already reset, skip
                if (!matchData?.player1_ready && !matchData?.player2_ready) {
                  console.log('🏆 Flags already reset to false, skipping');
                  setReadyFlagsReset(true);
                  return;
                }
                
                // If any player is true, we need to reset because they left and came back
                console.log('🏆 Players have ready=true from previous attempt, forcing reset');
                // Force reset by updating directly
                const { error: forceResetError } = await supabase
                  .from('tournament_matches')
                  .update({ 
                    player1_ready: false, 
                    player2_ready: false,
                    ready_flags_initialized: true // Keep as initialized
                  })
                  .eq('id', matchId);
                
                if (forceResetError) {
                  console.error('🏆 ❌ Error force-resetting ready flags:', forceResetError);
                } else {
                  console.log('🏆 ✅ Force-reset ready flags for fresh match attempt');
                  // CRITICAL: Wait a bit for the update to propagate before continuing
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                setReadyFlagsReset(true);
                return;
              }
              
              // First time initialization
              console.log('🏆 First player to see this ready match, resetting ready flags');
              const { error } = await supabase
                .from('tournament_matches')
                .update({ 
                  player1_ready: false, 
                  player2_ready: false,
                  ready_flags_initialized: true
                })
                .eq('id', matchId)
                .eq('ready_flags_initialized', false);
              
              if (error) {
                console.error('🏆 ❌ Error resetting ready flags:', error);
              } else {
                console.log('🏆 ✅ Ready flags initialized to false');
              }
              setReadyFlagsReset(true);
            } else {
              // Match is in_progress or completed, don't reset
              console.log('🏆 Match is not in ready status, skipping flag reset');
              setReadyFlagsReset(true);
            }
          } catch (err) {
            console.error('🏆 ❌ Exception resetting ready flags:', err);
            setReadyFlagsReset(true); // Continue anyway
          }
        };
        
        resetReadyFlags();
        
        setIsLoading(false);
      } else {
        console.log('🏆 Match NOT found in bracket');
        setIsLoading(false);
      }
    } else {
      console.log('🏆 No bracket or matchId available', { hasActiveTournament: !!activeTournament, hasBracket: !!activeTournament?.currentBracket, matchId });
      setIsLoading(false);
    }
  }, [matchId, activeTournament?.currentBracket, user?.id, navigate, activeTournament?.id])

  // Check if we came from ship placement (update hasPlacedShips if needed)
  useEffect(() => {
    if (!matchId) return;
    
    // If already marked as placed, nothing to do
    if (hasPlacedShips) return;
    
    // Check gameStore (for immediate after placement)
    const gameState = useGameStore.getState();
    if (gameState.myBoard && gameState.opponentBoard && gameState.matchId === matchId) {
      console.log('🏆 Ships just placed (from gameStore), showing ready button');
      setHasPlacedShips(true);
      sessionStorage.setItem(`ships_placed_${matchId}`, 'true');
    }
  }, [matchId, hasPlacedShips]);

  // Subscribe to match updates to see opponent ready status
  // WAIT for ready flags to be reset before starting subscription
  useEffect(() => {
    if (!matchId || !user || !match) {
      console.log('🏆 Waiting to subscribe...', { matchId, user: !!user, match: !!match });
      return;
    }

    // CRITICAL: Don't start subscription until ready flags have been reset
    if (!readyFlagsReset) {
      console.log('🏆 Waiting for ready flags to be reset before subscribing...');
      return;
    }

    console.log('🏆 Subscribing to match ready status updates');
    
    let pollingInterval;

    const subscription = supabase
      .channel(`match-ready:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournament_matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          console.log('🏆 Match status updated via realtime:', payload);
          const updatedMatch = payload.new;
          
          const isPlayer1 = match.player1_id === user.id;
          
          // Update opponent's ready status
          const opponentReady = isPlayer1 ? updatedMatch.player2_ready : updatedMatch.player1_ready;
          console.log('🏆 Opponent ready from realtime:', opponentReady);
          setOpponentReady(opponentReady || false);
          
          // Also update our own status in case it was changed elsewhere
          const myReady = isPlayer1 ? updatedMatch.player1_ready : updatedMatch.player2_ready;
          setPlayerReady(myReady || false);
        }
      )
      .subscribe();

    // Fetch initial ready status (after reset completes)
    const initializeReadyStatus = async () => {
      try {
        console.log('🏆 Fetching initial ready status for match:', matchId);
        
        const { data, error } = await supabase
          .from('tournament_matches')
          .select('player1_id, player2_id, player1_ready, player2_ready')
          .eq('id', matchId)
          .single();
        
        console.log('🏆 Initial fetch response - data:', !!data, 'error:', !!error, 'error details:', error);
        
        if (error) {
          console.error('🏆 Initial fetch error:', error.message, error);
          return;
        }
        
        if (!data) {
          console.error('🏆 Initial fetch: No data returned (data is null/undefined)');
          return;
        }
        
        console.log('🏆 Initial fetch data:', {
          player1_ready: data.player1_ready,
          player2_ready: data.player2_ready,
          myId: user?.id?.substring(0, 8)
        });
        
        const isPlayer1 = data.player1_id === user.id;
        const myReadyFromDB = isPlayer1 ? data.player1_ready : data.player2_ready;
        const opponentReadyFromDB = isPlayer1 ? data.player2_ready : data.player1_ready;
        
        setOpponentReady(opponentReadyFromDB || false);
        
        // Only set playerReady if we haven't manually marked ready yet
        // This prevents overwriting the ready state after user clicks button
        if (!manuallyMarkedReady.current) {
          setPlayerReady(myReadyFromDB || false);
          console.log('🏆 Initial ready status - Me:', myReadyFromDB, 'Opponent:', opponentReadyFromDB, '(Manual override: false)');
        } else {
          console.log('🏆 Initial ready status - Me: LOCKED (manual), Opponent:', opponentReadyFromDB, '(Manual override: true)');
        }
      } catch (err) {
        console.error('🏆 Initial fetch exception:', err);
      }
    };
    
    initializeReadyStatus();

    // CRITICAL: Add polling fallback in case realtime doesn't work
    // Use REST API for consistency (same as handleMarkReady)
    pollingInterval = setInterval(async () => {
      try {
        console.log('🏆 Polling tick - matchId:', matchId, 'user:', user?.id?.substring(0, 8), 'match exists:', !!match);
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        // Use REST API with timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(
          `${supabaseUrl}/rest/v1/tournament_matches?id=eq.${matchId}&select=player1_id,player2_id,player1_ready,player2_ready`,
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${session?.access_token}`
            },
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error('🏆 Polling REST API error:', response.status);
          return;
        }
        
        const results = await response.json();
        const data = results?.[0]; // REST API returns array
        
        console.log('🏆 Polling response - data:', !!data, 'status:', response.status);
        
        if (!data) {
          console.error('🏆 Polling: No data returned (data is null/undefined)');
          return;
        }
        
        console.log('🏆 Polling data:', { 
          player1_ready: data.player1_ready, 
          player2_ready: data.player2_ready,
          player1_id: data.player1_id?.substring(0, 8),
          player2_id: data.player2_id?.substring(0, 8),
          myId: user?.id?.substring(0, 8)
        });
        
        const isPlayer1 = data.player1_id === user?.id;
        const opponentReady = isPlayer1 ? data.player2_ready : data.player1_ready;
        const myReady = isPlayer1 ? data.player1_ready : data.player2_ready;
        
        console.log('🏆 Polling check - I am:', isPlayer1 ? 'Player 1' : 'Player 2', '| Me:', myReady, 'Opponent:', opponentReady, '(Manual lock:', manuallyMarkedReady.current, ')');
        setOpponentReady(opponentReady || false);
        
        // Only update playerReady from polling if we haven't manually marked ready
        // This prevents race conditions with the manual mark ready action
        if (!manuallyMarkedReady.current) {
          setPlayerReady(myReady || false);
        } else {
          console.log('🏆 Polling: Skipping playerReady update (manually locked at true)');
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          console.error('🏆 Polling timeout (5s) - retrying next interval');
        } else {
          console.error('🏆 Polling exception:', err);
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      console.log('🏆 Unsubscribing from match ready status');
      subscription.unsubscribe();
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [matchId, user, match, readyFlagsReset]); // Add readyFlagsReset dependency

  // Navigate to gameplay when both players are ready
  useEffect(() => {
    console.log('🏆 Navigation effect - playerReady:', playerReady, 'opponentReady:', opponentReady, 'navigationTriggered:', navigationTriggered.current);
    
    if (playerReady && opponentReady && matchId && !navigationTriggered.current) {
      console.log('🏆 ✅ Both players ready! Navigating to gameplay in 1 second...');
      navigationTriggered.current = true;
      setTimeout(() => {
        console.log('🏆 🚀 Executing navigation now...');
        navigate(`/tournament-game-play/${matchId}`);
      }, 1000); // Small delay to show "Both Ready!" state
    }
  }, [playerReady, opponentReady, matchId, navigate]);

  const handleMarkReady = async () => {
    // Prevent double-clicking
    if (playerReady) {
      console.log('🏆 Already marked as ready, ignoring');
      return;
    }
    
    console.log('🏆 Marking player as ready - Debug:', { 
      hasPlacedShips, 
      matchId, 
      userId: user?.id, 
      matchExists: !!match,
      player1Id: match?.player1_id,
      player2Id: match?.player2_id
    });
    
    if (!hasPlacedShips) {
      console.error('🏆 Cannot mark ready: Ships not placed');
      return;
    }
    if (!matchId) {
      console.error('🏆 Cannot mark ready: No matchId');
      return;
    }
    if (!user) {
      console.error('🏆 Cannot mark ready: No user');
      return;
    }
    if (!match) {
      console.error('🏆 Cannot mark ready: No match data');
      return;
    }

    try {
      const isPlayer1 = match.player1_id === user.id;
      const fieldName = isPlayer1 ? 'player1_ready' : 'player2_ready';
      console.log('🏆 Player position:', isPlayer1 ? 'Player 1' : 'Player 2');
      console.log('🏆 Updating field:', fieldName);
      
      // Use REST API directly to avoid Supabase client hanging issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log('🏆 Sending update via REST API...');
      
      // WAIT for the response to ensure database is updated before setting state
      const response = await fetch(`${supabaseUrl}/rest/v1/tournament_matches?id=eq.${matchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session?.access_token}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ [fieldName]: true })
      });
      
      if (!response.ok) {
        console.error('🏆 REST API error:', response.status);
        alert('Failed to mark as ready. Please try again.');
      } else {
        console.log('🏆 ✅ Successfully sent ready status update via REST API');
        
        // Mark that user manually clicked ready (prevents initial fetch from overwriting)
        manuallyMarkedReady.current = true;
        
        // ONLY set state after database update succeeds
        setPlayerReady(true);
        console.log('🏆 Ready status set to true, polling will detect both players ready...');
      }
    } catch (err) {
      console.error('🏆 Error marking ready:', err);
      setPlayerReady(false);
      alert('Failed to mark as ready. Please try again.');
    }
  };

  const handlePlaceShips = async () => {
    if (!match || !activeTournament) return;

    setIsStarting(true);
    try {
      console.log('🏆 Going to ship placement:', match.id);
      
      // Navigate to ship placement screen
      navigate(`/tournament-ship-placement/${match.id}`);
    } catch (err) {
      console.error('🏆 Failed to start match:', err);
      alert('Failed to start match. Please try again.');
    } finally {
      setIsStarting(false);
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

  const isPlayer1 = match.player1_id === user?.id;
  const currentPlayer = isPlayer1 ? match.player1 : match.player2;
  const roundName = match.round === 1 ? `Round ${match.round}` : 
                    match.round === 2 ? 'Quarter-Finals' :
                    match.round === 3 ? 'Semi-Finals' : 'Finals';

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      {/* Header */}
      <header className="bg-navy-800 border-b border-navy-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Tournament</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Tournament Info Banner */}
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <div>
                  <h2 className="text-2xl font-bold">{activeTournament?.name}</h2>
                  <p className="text-gray-300">{roundName} - {match.bracket_position}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Match Status</p>
                <p className="text-lg font-bold text-green-400">
                  {match.status === 'ready' ? 'Ready to Start' : 'Waiting...'}
                </p>
              </div>
            </div>
          </div>

          {/* VS Display */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Current Player */}
            <div className="bg-navy-800 rounded-lg border-2 border-blue-500 p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold mb-2">{currentPlayer?.username}</h3>
                <p className="text-sm text-blue-400 font-semibold">YOU</p>
                
                {/* Ready Indicator */}
                <div className="mt-4">
                  {playerReady ? (
                    <div className="flex items-center justify-center space-x-2 text-green-400">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-semibold">Ready!</span>
                    </div>
                  ) : hasPlacedShips ? (
                    <button
                      onClick={handleMarkReady}
                      className="btn-primary text-sm px-4 py-2"
                    >
                      Ready to Battle
                    </button>
                  ) : (
                    <div className="text-sm text-gray-400">
                      Not Ready
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* VS Icon */}
            <div className="flex items-center justify-center">
              <div className="bg-navy-700 rounded-full p-8 border-4 border-navy-600">
                <Swords className="w-16 h-16 text-red-400" />
              </div>
            </div>

            {/* Opponent */}
            <div className="bg-navy-800 rounded-lg border-2 border-red-500 p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold mb-2">{opponent.username}</h3>
                <p className="text-sm text-red-400 font-semibold">OPPONENT</p>
                
                {/* Opponent Ready Indicator */}
                <div className="mt-4">
                  {opponentReady ? (
                    <div className="flex items-center justify-center space-x-2 text-green-400">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-semibold">Ready!</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2 text-gray-400">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Waiting...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Match Details Card */}
          <div className="bg-navy-800 rounded-lg border border-navy-700 p-6 mb-8">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Match Details</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Round</p>
                <p className="font-semibold">{roundName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Position</p>
                <p className="font-semibold">{match.bracket_position || `Match ${match.match_number}`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Match Number</p>
                <p className="font-semibold">#{match.match_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className="font-semibold text-green-400">{match.status.toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center space-y-4">
            {!hasPlacedShips ? (
              // Step 1: Place ships
              <button
                onClick={handlePlaceShips}
                disabled={isStarting}
                className="btn-primary px-12 py-4 text-lg"
              >
                {isStarting ? (
                  <span className="flex items-center space-x-2">
                    <LoadingSpinner size="small" />
                    <span>Loading...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <Ship className="w-6 h-6" />
                    <span>Fleet Deployed</span>
                  </span>
                )}
              </button>
            ) : playerReady && opponentReady ? (
              // Step 3: Both ready - navigating to battle
              <div className="bg-green-900/50 border border-green-500 rounded-lg p-6">
                <div className="flex items-center justify-center space-x-3 text-green-400 mb-2">
                  <Check className="w-8 h-8" />
                  <span className="text-2xl font-bold">Both Players Ready!</span>
                </div>
                <p className="text-gray-300">Starting battle...</p>
              </div>
            ) : playerReady ? (
              // Step 2b: Waiting for opponent
              <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-6">
                <div className="flex items-center justify-center space-x-3 text-blue-400 mb-2">
                  <Clock className="w-6 h-6 animate-spin" />
                  <span className="text-xl font-semibold">Waiting for {opponent.username}...</span>
                </div>
                <p className="text-gray-400 text-sm">Your opponent needs to mark themselves as ready</p>
              </div>
            ) : (
              // Step 2a: Mark yourself as ready
              <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-6">
                <p className="text-yellow-400 font-semibold mb-3">Fleet deployed! Mark yourself as ready to begin battle.</p>
                <button
                  onClick={handleMarkReady}
                  className="btn-primary px-8 py-3"
                >
                  <span className="flex items-center space-x-2">
                    <Check className="w-5 h-5" />
                    <span>Ready to Battle</span>
                  </span>
                </button>
              </div>
            )}

            {!hasPlacedShips && (
              <p className="text-sm text-gray-400">
                You need to place your fleet before you can mark yourself as ready
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
            <h4 className="font-semibold mb-2">Match Rules</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Standard Battleship rules apply</li>
              <li>• Winner advances to the next round</li>
              <li>• Match result will be automatically recorded</li>
              <li>• Both players must be ready to start</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentMatchWaiting;
