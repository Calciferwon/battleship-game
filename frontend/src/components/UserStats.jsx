import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const UserStats = ({ userId }) => {
  const [gameHistory, setGameHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchGameHistory();
    }
  }, [userId]);

  const fetchGameHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch recent games for this user with player profiles
      const { data, error } = await supabase
        .from('games')
        .select(`
          id,
          status,
          winner_id,
          win_reason,
          created_at,
          started_at,
          ended_at,
          player1_id,
          player2_id,
          player1:profiles!games_player1_id_fkey(username),
          player2:profiles!games_player2_id_fkey(username)
        `)
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform data to add username fields
      const transformedData = (data || []).map(game => ({
        ...game,
        player1_username: game.player1?.username || 'Unknown',
        player2_username: game.player2?.username || 'Unknown'
      }));

      setGameHistory(transformedData);
    } catch (err) {
      console.error('Error fetching game history:', err);
      setError('Failed to load game history');
    } finally {
      setIsLoading(false);
    }
  };

  const getGameResult = (game) => {
    if (game.winner_id === userId) {
      return { result: 'Won', color: 'text-green-400', icon: '🏆' };
    } else if (game.winner_id) {
      return { result: 'Lost', color: 'text-red-400', icon: '💔' };
    } else {
      return { result: 'Draw', color: 'text-gray-400', icon: '🤝' };
    }
  };

  const getOpponent = (game) => {
    if (game.player1_id === userId) {
      return game.player2_username || 'Unknown';
    } else {
      return game.player1_username || 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getGameDuration = (game) => {
    if (!game.started_at || !game.ended_at) return 'Unknown';

    const start = new Date(game.started_at);
    const end = new Date(game.ended_at);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '< 1m';
    if (diffMins < 60) return `${diffMins}m`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Recent Games</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-navy-700 rounded-lg p-4 h-16"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Recent Games</h3>
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchGameHistory}
            className="btn-secondary mt-4"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Recent Games</h3>
        <button
          onClick={fetchGameHistory}
          className="text-gray-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {gameHistory.length === 0 ? (
        <div className="text-center py-8 bg-navy-700 rounded-lg">
          <p className="text-gray-400">No games played yet</p>
          <p className="text-sm text-gray-500 mt-1">Start your first battle!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gameHistory.map((game) => {
            const { result, color, icon } = getGameResult(game);
            const opponent = getOpponent(game);

            return (
              <div
                key={game.id}
                className="bg-navy-700 rounded-lg p-4 hover:bg-navy-600 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${color}`}>{result}</span>
                        <span className="text-gray-400">vs</span>
                        <span className="text-white font-medium">{opponent}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                        <span>{formatDate(game.ended_at)}</span>
                        <span>•</span>
                        <span>{getGameDuration(game)}</span>
                        {game.win_reason && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{game.win_reason.replace('_', ' ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    className="text-ocean-400 hover:text-ocean-300 text-sm font-medium"
                    onClick={() => {
                      // TODO: Navigate to game details/replay
                      console.log('View game:', game.id);
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button (if needed in future) */}
      {gameHistory.length >= 10 && (
        <button className="btn-secondary w-full mt-4">
          Load More Games
        </button>
      )}
    </div>
  );
};

export default UserStats;
