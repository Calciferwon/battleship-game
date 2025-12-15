import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTournamentStore from '../stores/tournamentStore';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import CreateTournamentModal from './CreateTournamentModal';

const TournamentLobby = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tournaments = useTournamentStore((state) => state.tournaments);
  const isLoading = useTournamentStore((state) => state.isLoading);
  const error = useTournamentStore((state) => state.error);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'registration', 'active', 'completed'
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    let isCleanedUp = false;

    // Initialize tournament service
    const initializeService = async () => {
      try {
        if (isCleanedUp) return;
        
        const store = useTournamentStore.getState();
        await store.init();
        
        // Subscribe to real-time updates
        if (!isCleanedUp && !store.subscribed) {
          store.subscribeToTournaments();
        }
      } catch (error) {
        console.error('Failed to initialize tournament service:', error);
      }
    };

    initializeService();

    // Cleanup function - just mark as cleaned up, don't unsubscribe
    // Keep subscriptions alive for tournament details page
    return () => {
      isCleanedUp = true;
      // Don't unsubscribe - let tournament details page maintain subscriptions
    };
  }, []); // Run once on mount

  useEffect(() => {
    // Fetch tournaments when filter changes
    const loadTournaments = async () => {
      try {
        const store = useTournamentStore.getState();
        if (filter === 'all') {
          await store.fetchTournaments();
        } else {
          await store.fetchTournaments(filter);
        }
      } catch (error) {
        console.error('Failed to fetch tournaments:', error);
      }
    };

    loadTournaments();
  }, [filter]); // Only re-run when filter changes

  const handleJoinTournament = async (tournamentId) => {
    if (!user) return;

    setJoiningId(tournamentId);
    try {
      const store = useTournamentStore.getState();
      await store.joinTournament(tournamentId);
      // Navigate to tournament details
      navigate(`/tournament/${tournamentId}`);
    } catch (error) {
      console.error('Failed to join tournament:', error);
    } finally {
      setJoiningId(null);
    }
  };

  const handleViewTournament = (tournamentId) => {
    navigate(`/tournament/${tournamentId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'registration':
        return 'bg-green-500';
      case 'active':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-gray-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filteredTournaments = tournaments;

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      {/* Header */}
      <header className="bg-navy-800 border-b border-navy-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-3xl">🏆</span>
                <h1 className="text-2xl font-bold">Tournaments</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/tournament-history')}
                className="btn-secondary"
              >
                📊 History
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                + Create Tournament
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex space-x-2 mb-6">
          {['all', 'registration', 'active', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-navy-800 text-gray-400 hover:bg-navy-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button 
              onClick={() => useTournamentStore.getState().clearError()} 
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !tournaments.length ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Tournaments Grid */}
            {filteredTournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-xl text-gray-400 mb-2">No tournaments found</p>
                <p className="text-gray-500 mb-6">Be the first to create one!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                >
                  Create Tournament
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTournaments.map((tournament) => {
                  const isFull = tournament.current_players >= tournament.max_players;
                  const isCreator = user && tournament.created_by === user.id;
                  const isParticipant = user && tournament.participants?.some(
                    (p) => p.user_id === user.id
                  );

                  return (
                    <div
                      key={tournament.id}
                      className="bg-navy-800 rounded-lg border border-navy-700 hover:border-blue-500 transition-colors overflow-hidden"
                    >
                      {/* Tournament Header */}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-xl font-bold">{tournament.name}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              tournament.status
                            )}`}
                          >
                            {getStatusText(tournament.status)}
                          </span>
                        </div>

                        {tournament.description && (
                          <p className="text-gray-400 text-sm mb-4">
                            {tournament.description}
                          </p>
                        )}

                        {/* Tournament Info */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Players</span>
                            <span className="font-semibold">
                              {tournament.current_players} / {tournament.max_players}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Created by</span>
                            <span className="font-semibold">
                              {tournament.creator?.username || 'Unknown'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Created</span>
                            <span className="text-gray-400">
                              {new Date(tournament.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="w-full bg-navy-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{
                                width: `${
                                  (tournament.current_players / tournament.max_players) * 100
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-2">
                          {tournament.status === 'registration' && !isParticipant && !isFull && (
                            <button
                              onClick={() => handleJoinTournament(tournament.id)}
                              disabled={joiningId === tournament.id}
                              className="flex-1 btn-primary"
                            >
                              {joiningId === tournament.id ? (
                                <span className="flex items-center justify-center">
                                  <LoadingSpinner size="small" />
                                  <span className="ml-2">Joining...</span>
                                </span>
                              ) : (
                                'Join Tournament'
                              )}
                            </button>
                          )}

                          {tournament.status === 'registration' && isParticipant && (
                            <button className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold cursor-default">
                              ✓ Joined
                            </button>
                          )}

                          {tournament.status === 'registration' && isFull && !isParticipant && (
                            <button className="flex-1 bg-gray-600 text-gray-400 px-4 py-2 rounded-lg font-semibold cursor-not-allowed">
                              Full
                            </button>
                          )}

                          {(isCreator || isParticipant || tournament.status !== 'registration') && (
                            <button
                              onClick={() => handleViewTournament(tournament.id)}
                              className="flex-1 btn-secondary"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <CreateTournamentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(tournament) => {
            setShowCreateModal(false);
            navigate(`/tournament/${tournament.id}`);
          }}
        />
      )}
    </div>
  );
};

export default TournamentLobby;
