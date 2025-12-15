import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useTournamentStore from '../stores/tournamentStore';
import LoadingSpinner from './LoadingSpinner';
import TournamentBracket from './TournamentBracket';
import { Trophy, Users, Calendar, Crown, Play, LogOut, X } from 'lucide-react';

const TournamentDetails = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use selectors for state (reactive)
  const activeTournament = useTournamentStore((state) => state.activeTournament);
  const currentMatch = useTournamentStore((state) => state.currentMatch);
  const isLoading = useTournamentStore((state) => state.isLoading);
  const error = useTournamentStore((state) => state.error);

  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showBracket, setShowBracket] = useState(false);
  const [userCurrentMatch, setUserCurrentMatch] = useState(null);
  const [isFixingRounds, setIsFixingRounds] = useState(false);
  const [fixMessage, setFixMessage] = useState(null);

  useEffect(() => {
    if (tournamentId) {
      const store = useTournamentStore.getState();
      store.fetchTournamentDetails(tournamentId);
    }

    // Don't cleanup subscriptions on unmount - keep them active
    return () => {
      // Do NOT unsubscribe - subscriptions should persist
    };
  }, [tournamentId]);

  // Find user's current match from bracket
  useEffect(() => {
    if (activeTournament?.currentBracket && user) {
      console.log('🏆 Checking for user current match. Total bracket matches:', activeTournament.currentBracket.length);
      
      // Find the user's pending match (not completed, not in progress)
      const pendingMatches = activeTournament.currentBracket.filter((match) => {
        const isUserInMatch = match.player1_id === user.id || match.player2_id === user.id;
        const isPending = match.status === 'pending' || match.status === 'ready';
        
        if (isUserInMatch) {
          console.log('🏆 User match found:', {
            position: match.bracket_position,
            status: match.status,
            isPending,
            matchId: match.id
          });
        }
        
        return isUserInMatch && isPending;
      });

      if (pendingMatches.length > 0) {
        const match = pendingMatches[0];
        const opponent = match.player1_id === user.id ? match.player2 : match.player1;
        console.log('🏆 User current match found:', match.bracket_position, 'vs', opponent?.username, 'Status:', match.status);
        setUserCurrentMatch({
          match,
          opponent,
        });
      } else {
        console.log('🏆 No pending matches found for user');
        setUserCurrentMatch(null);
      }
    }
  }, [activeTournament?.currentBracket, user]);

  // Auto-navigate to match waiting room when user has a ready match
  // DISABLED temporarily to prevent 404 loops - users must click Start Match manually
  /*
  useEffect(() => {
    if (userCurrentMatch?.match && userCurrentMatch?.opponent) {
      const { match } = userCurrentMatch;
      
      // Only auto-navigate if match is ready (both players assigned) and not completed
      if (match.status === 'ready' && match.player1_id && match.player2_id) {
        console.log('🏆 Auto-navigating to match waiting room:', match.bracket_position, 'Match ID:', match.id);
        // Small delay to ensure state is updated
        setTimeout(() => {
          navigate(`/tournament-match-waiting/${match.id}`);
        }, 500);
      } else {
        console.log('🏆 Not auto-navigating - Match status:', match.status, 'Players:', {
          player1: match.player1_id ? 'assigned' : 'waiting',
          player2: match.player2_id ? 'assigned' : 'waiting'
        });
      }
    }
  }, [userCurrentMatch, navigate]);
  */

  useEffect(() => {
    // Auto-show bracket if tournament is active
    if (activeTournament?.status === 'active') {
      setShowBracket(true);
    }
  }, [activeTournament?.status]);

  const handleStartTournament = async () => {
    if (!tournamentId) return;
    
    setIsStarting(true);
    try {
      console.log('🏆 [COMPONENT] handleStartTournament called for:', tournamentId);
      const store = useTournamentStore.getState();
      await store.startTournament(tournamentId);
      console.log('🏆 [COMPONENT] startTournament completed successfully');
      
      // Refresh tournament details to get updated status
      console.log('🏆 [COMPONENT] Refreshing tournament details...');
      await store.fetchTournamentDetails(tournamentId);
      console.log('🏆 [COMPONENT] Tournament details refreshed');
      
      setShowBracket(true);
    } catch (err) {
      console.error('🏆 [COMPONENT] ❌ Failed to start tournament:', err);
      console.error('🏆 [COMPONENT] Error message:', err.message);
      console.error('🏆 [COMPONENT] Full error:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeaveTournament = async () => {
    if (!tournamentId) return;
    
    setIsLeaving(true);
    try {
      const store = useTournamentStore.getState();
      await store.leaveTournament(tournamentId);
      navigate('/tournaments');
    } catch (err) {
      console.error('Failed to leave tournament:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleStartMatch = () => {
    if (currentMatch) {
      navigate(`/tournament-match/${currentMatch.match.id}`);
    }
  };

  const handleFixRounds = async () => {
    if (!tournamentId) return;
    
    setIsFixingRounds(true);
    setFixMessage(null);
    try {
      console.log('🏆 [COMPONENT] Fixing tournament rounds...');
      const store = useTournamentStore.getState();
      const result = await store.checkAndFixAllRounds(tournamentId);
      
      if (result.success) {
        setFixMessage({
          type: 'success',
          text: result.message
        });
        // Auto-hide after 5 seconds
        setTimeout(() => setFixMessage(null), 5000);
      } else {
        setFixMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch (err) {
      console.error('🏆 [COMPONENT] Failed to fix rounds:', err);
      setFixMessage({
        type: 'error',
        text: err.message || 'Failed to fix rounds'
      });
    } finally {
      setIsFixingRounds(false);
    }
  };

  if (isLoading && !activeTournament) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!activeTournament) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-400 mb-4">Tournament not found</p>
          <button onClick={() => navigate('/tournaments')} className="btn-primary">
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  const isCreator = user && activeTournament.created_by === user.id;
  const isParticipant = user && activeTournament.participants?.some(
    (p) => p.user_id === user.id
  );
  const canStart = isCreator && 
    activeTournament.status === 'registration' && 
    activeTournament.current_players >= 2;
  const needsGenerateBracket = isCreator && 
    activeTournament.status === 'active' && 
    (!activeTournament.currentBracket || activeTournament.currentBracket.length === 0);
  const canLeave = isParticipant && activeTournament.status === 'registration';

  const getStatusColor = (status) => {
    switch (status) {
      case 'registration': return 'text-green-400';
      case 'active': return 'text-blue-400';
      case 'completed': return 'text-gray-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      {/* Header */}
      <header className="bg-navy-800 border-b border-navy-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/tournaments')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <div className="flex items-center space-x-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <div>
                  <h1 className="text-2xl font-bold">{activeTournament.name}</h1>
                  <p className={`text-sm ${getStatusColor(activeTournament.status)}`}>
                    {getStatusText(activeTournament.status)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              {canStart && (
                <button
                  onClick={handleStartTournament}
                  disabled={isStarting}
                  className="btn-primary flex items-center space-x-2"
                >
                  {isStarting ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Start Tournament</span>
                    </>
                  )}
                </button>
              )}

              {needsGenerateBracket && (
                <button
                  onClick={handleStartTournament}
                  disabled={isStarting}
                  className="btn-primary flex items-center space-x-2"
                >
                  {isStarting ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>Generating Bracket...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Generate Bracket</span>
                    </>
                  )}
                </button>
              )}

              {isCreator && activeTournament.status === 'active' && activeTournament.currentBracket?.length > 0 && (
                <button
                  onClick={handleFixRounds}
                  disabled={isFixingRounds}
                  className="btn-secondary flex items-center space-x-2"
                  title="Check and activate next round if current round is complete"
                >
                  {isFixingRounds ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Progress Rounds</span>
                    </>
                  )}
                </button>
              )}

              {canLeave && (
                <button
                  onClick={handleLeaveTournament}
                  disabled={isLeaving}
                  className="btn-secondary flex items-center space-x-2"
                >
                  {isLeaving ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>Leaving...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span>Leave</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Fix Rounds Message */}
      {fixMessage && (
        <div className="container mx-auto px-4 py-4">
          <div className={`p-4 border rounded-lg flex justify-between items-center ${
            fixMessage.type === 'success' 
              ? 'bg-green-900/50 border-green-500' 
              : 'bg-red-900/50 border-red-500'
          }`}>
            <span>{fixMessage.text}</span>
            <button 
              onClick={() => setFixMessage(null)} 
              className={fixMessage.type === 'success' ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="container mx-auto px-4 py-4">
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button 
              onClick={() => useTournamentStore.getState().clearError()} 
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tournament Winner Congratulations */}
      {activeTournament?.status === 'completed' && activeTournament?.winner_id === user?.id && (
        <div className="container mx-auto px-4 py-4">
          <div className="p-8 bg-gradient-to-r from-yellow-900/50 via-yellow-800/50 to-yellow-900/50 border-2 border-yellow-500 rounded-lg animate-pulse-slow">
            <div className="flex items-center justify-center space-x-4">
              <Crown className="w-12 h-12 text-yellow-400 animate-bounce" />
              <div className="text-center">
                <h2 className="text-4xl font-bold text-yellow-400 mb-2">
                  🎉 CONGRATULATIONS! 🎉
                </h2>
                <p className="text-2xl font-semibold text-white mb-1">
                  You are the Tournament Champion!
                </p>
                <p className="text-lg text-gray-300">
                  You have conquered {activeTournament.name}
                </p>
              </div>
              <Trophy className="w-12 h-12 text-yellow-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Your Current Match Alert */}
      {currentMatch && currentMatch.tournamentId === tournamentId && (
        <div className="container mx-auto px-4 py-4">
          <div className="p-6 bg-gradient-to-r from-green-900/50 to-blue-900/50 border border-green-500 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2 flex items-center space-x-2">
                  <Play className="w-6 h-6" />
                  <span>Your Match is Ready!</span>
                </h3>
                <p className="text-gray-300">
                  Round {currentMatch.match.round} - {currentMatch.match.bracket_position}
                </p>
                <p className="text-gray-400">
                  Opponent: {currentMatch.opponent?.username || 'Loading...'}
                </p>
              </div>
              <button onClick={handleStartMatch} className="btn-primary px-8">
                Start Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info & Participants */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tournament Info */}
            <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
              <h2 className="text-xl font-bold mb-4">Tournament Info</h2>
              
              {activeTournament.description && (
                <p className="text-gray-400 mb-4">{activeTournament.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Players</span>
                  </span>
                  <span className="font-semibold">
                    {activeTournament.current_players} / {activeTournament.max_players}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center space-x-2">
                    <Crown className="w-4 h-4" />
                    <span>Creator</span>
                  </span>
                  <span className="font-semibold">
                    {activeTournament.creator?.username || 'Unknown'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Created</span>
                  </span>
                  <span className="text-gray-400 text-sm">
                    {new Date(activeTournament.created_at).toLocaleDateString()}
                  </span>
                </div>

                {activeTournament.status === 'active' && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Current Round</span>
                    <span className="font-semibold text-blue-400">
                      Round {activeTournament.current_round}
                    </span>
                  </div>
                )}

                {activeTournament.status === 'completed' && activeTournament.winner_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Winner</span>
                    <span className="font-semibold text-yellow-400 flex items-center space-x-1">
                      <Crown className="w-4 h-4" />
                      <span>
                        {activeTournament.participants.find(
                          (p) => p.user_id === activeTournament.winner_id
                        )?.user?.username || 'Unknown'}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Participants List */}
            <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
              <h2 className="text-xl font-bold mb-4">
                Participants ({activeTournament.participants?.length || 0})
              </h2>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activeTournament.participants?.map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      participant.user_id === user?.id
                        ? 'bg-blue-900/30 border border-blue-500'
                        : 'bg-navy-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {participant.seed && (
                        <span className="text-xs font-bold text-gray-400 w-6">
                          #{participant.seed}
                        </span>
                      )}
                      <span className="font-medium">{participant.user?.username}</span>
                      {participant.user_id === user?.id && (
                        <span className="text-xs bg-blue-500 px-2 py-1 rounded">You</span>
                      )}
                    </div>
                    
                    {participant.eliminated && (
                      <span className="text-xs text-red-400">Eliminated</span>
                    )}
                    
                    {participant.placement === 1 && (
                      <span className="text-yellow-400">
                        <Crown className="w-5 h-5" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Bracket */}
          <div className="lg:col-span-2 space-y-6">
            {/* Your Next Match Section */}
            {activeTournament.status === 'active' && user && (
              <div className="bg-gradient-to-r from-blue-900/50 to-navy-800 rounded-lg border border-blue-500/30 p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                  <Play className="w-5 h-5 text-blue-400" />
                  <span>Your Next Match</span>
                </h3>
                <div className="space-y-4">
                  {activeTournament.currentBracket && activeTournament.currentBracket.length > 0 ? (
                    (() => {
                      // Use the already-computed userCurrentMatch
                      if (userCurrentMatch) {
                        return (
                          <div>
                            <div className="bg-navy-800/50 rounded p-4 mb-4">
                              <p className="text-sm text-gray-400 mb-2">Round {userCurrentMatch.match.round} - {userCurrentMatch.match.bracket_position}</p>
                              <div className="text-center">
                                <p className="text-gray-300 mb-1">vs</p>
                                <p className="text-xl font-bold text-blue-400">
                                  {userCurrentMatch.opponent?.username || 'Waiting for opponent...'}
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                // Navigate to match page
                                navigate(`/tournament-match/${userCurrentMatch.match.id}`);
                              }}
                              className="w-full btn-primary"
                            >
                              <Play className="w-4 h-4 mr-2 inline" />
                              Start Battle
                            </button>
                          </div>
                        );
                      } else {
                        // Check if user has a completed match or eliminated
                        const userHasCompleted = activeTournament.currentBracket.some(match =>
                          (match.player1_id === user.id || match.player2_id === user.id) &&
                          match.status === 'completed'
                        );
                        
                        if (userHasCompleted) {
                          return (
                            <div className="text-center text-gray-400 py-4">
                              <p>Waiting for other matches in your bracket to complete...</p>
                            </div>
                          );
                        } else {
                          return (
                            <div className="text-center text-gray-400 py-4">
                              <p>Waiting for your first match to be ready...</p>
                            </div>
                          );
                        }
                      }
                    })()
                  ) : (
                    <div className="text-center text-gray-400 py-4">
                      <p>Loading bracket...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bracket Section */}
            {activeTournament.status === 'registration' ? (
              <div className="bg-navy-800 rounded-lg border border-navy-700 p-12 text-center">
                <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Waiting for Tournament to Start</h3>
                <p className="text-gray-400 mb-6">
                  {canStart
                    ? 'You can start the tournament when ready!'
                    : 'The tournament will begin once the creator starts it.'}
                </p>
                {!canStart && (
                  <p className="text-sm text-gray-500">
                    Current players: {activeTournament.current_players} / {activeTournament.max_players}
                    {activeTournament.current_players < 2 && ' (Need at least 2 players)'}
                    {activeTournament.current_players >= 2 &&
                      ![2, 4, 8, 16, 32].includes(activeTournament.current_players) &&
                      ' (Player count must be 2, 4, 8, 16, or 32)'}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Tournament Bracket</h2>
                  {activeTournament.status === 'active' && (
                    <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold animate-pulse">
                      Live
                    </span>
                  )}
                </div>
                
                <TournamentBracket tournamentId={tournamentId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentDetails;
