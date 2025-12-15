import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import LoadingSpinner from './LoadingSpinner';
import { Trophy, Target, Clock, TrendingUp, Award, Zap, Calendar } from 'lucide-react';

const GameHistory = ({ userId }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [recentSummary, setRecentSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchGameData();
    }
  }, [userId]);

  const fetchGameData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🎮 GameHistory: Fetching game data for user:', userId);

      // Fetch comprehensive stats
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_game_stats', { user_id_param: userId });

      if (statsError) {
        console.error('❌ Stats error:', statsError);
        throw statsError;
      }
      console.log('✅ Stats data:', statsData);
      setStats(statsData[0]);

      // Fetch game history
      const { data: historyData, error: historyError } = await supabase
        .rpc('get_user_game_history', { user_id_param: userId, limit_param: 10 });

      if (historyError) {
        console.error('❌ History error:', historyError);
        throw historyError;
      }
      console.log('✅ History data:', historyData);
      setGameHistory(historyData);

      // Fetch recent summary (last 7 days)
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_recent_games_summary', { user_id_param: userId, days_param: 7 });

      if (summaryError) {
        console.error('❌ Summary error:', summaryError);
        throw summaryError;
      }
      console.log('✅ Summary data:', summaryData);
      setRecentSummary(summaryData[0]);

    } catch (err) {
      console.error('❌ Error fetching game data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameModeLabel = (mode) => {
    const labels = {
      quick_match: 'Quick Match',
      private_room: 'Private Room',
      tournament: 'Tournament'
    };
    return labels[mode] || mode;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
        <p className="text-red-400">Failed to load game history: {error}</p>
        <button onClick={fetchGameData} className="mt-2 btn-secondary">
          Try Again
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overall Statistics Dashboard */}
      <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <span>Overall Statistics</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Total Games */}
          <div className="bg-navy-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-6 h-6 text-blue-400" />
              <span className="text-2xl font-bold">{stats.total_games}</span>
            </div>
            <p className="text-sm text-gray-400">Total Games</p>
          </div>

          {/* Wins */}
          <div className="bg-navy-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-6 h-6 text-green-400" />
              <span className="text-2xl font-bold text-green-400">{stats.wins}</span>
            </div>
            <p className="text-sm text-gray-400">Wins</p>
          </div>

          {/* Losses */}
          <div className="bg-navy-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-6 h-6 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{stats.losses}</span>
            </div>
            <p className="text-sm text-gray-400">Losses</p>
          </div>

          {/* Win Rate */}
          <div className="bg-navy-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              <span className="text-2xl font-bold text-purple-400">{stats.win_rate}%</span>
            </div>
            <p className="text-sm text-gray-400">Win Rate</p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Win Streak */}
          <div className="bg-navy-700 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-lg font-bold">{stats.current_win_streak}</span>
            </div>
            <p className="text-xs text-gray-400">Current Streak</p>
            <p className="text-xs text-gray-500">Best: {stats.best_win_streak}</p>
          </div>

          {/* Average Turns */}
          <div className="bg-navy-700 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Target className="w-5 h-5 text-cyan-400" />
              <span className="text-lg font-bold">{stats.avg_turns_per_game}</span>
            </div>
            <p className="text-xs text-gray-400">Avg Turns/Game</p>
            <p className="text-xs text-gray-500">Total: {stats.total_turns}</p>
          </div>

          {/* Avg Game Time */}
          <div className="bg-navy-700 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-5 h-5 text-orange-400" />
              <span className="text-lg font-bold">
                {formatDuration(stats.avg_game_duration_seconds)}
              </span>
            </div>
            <p className="text-xs text-gray-400">Avg Game Duration</p>
          </div>
        </div>
      </div>

      {/* Recent Performance (Last 7 Days) */}
      {recentSummary && recentSummary.games_played > 0 && (
        <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <span>Last 7 Days</span>
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{recentSummary.games_played}</p>
              <p className="text-sm text-gray-400">Games</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{recentSummary.wins}</p>
              <p className="text-sm text-gray-400">Wins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{recentSummary.losses}</p>
              <p className="text-sm text-gray-400">Losses</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{recentSummary.win_rate}%</p>
              <p className="text-sm text-gray-400">Win Rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Game Mode Stats */}
      <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
        <h3 className="text-xl font-bold mb-4">Performance by Mode</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Quick Match */}
          <div className="bg-navy-700 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-blue-400">Quick Match</h4>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Wins:</span>
              <span className="text-green-400 font-bold">{stats.quick_match_wins}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Losses:</span>
              <span className="text-red-400 font-bold">{stats.quick_match_losses}</span>
            </div>
          </div>

          {/* Tournament */}
          <div className="bg-navy-700 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-yellow-400">Tournament</h4>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Wins:</span>
              <span className="text-green-400 font-bold">{stats.tournament_wins}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Losses:</span>
              <span className="text-red-400 font-bold">{stats.tournament_losses}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Highlights */}
      <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
          <Award className="w-5 h-5 text-yellow-400" />
          <span>Achievements</span>
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-navy-700 rounded-lg p-3">
            <p className="text-sm text-gray-400 mb-1">Fastest Victory</p>
            <p className="text-xl font-bold text-green-400">
              {stats.fastest_win_turns ? `${stats.fastest_win_turns} turns` : 'N/A'}
            </p>
          </div>
          <div className="bg-navy-700 rounded-lg p-3">
            <p className="text-sm text-gray-400 mb-1">Longest Game</p>
            <p className="text-xl font-bold text-blue-400">
              {stats.longest_game_turns ? `${stats.longest_game_turns} turns` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Games History */}
      <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
        <h3 className="text-xl font-bold mb-4">Recent Games</h3>
        
        {gameHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No games played yet</p>
            <button
              onClick={() => navigate('/lobby')}
              className="mt-4 btn-primary"
            >
              Play Your First Game
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {gameHistory.map((game) => (
              <div
                key={game.game_id}
                className={`p-4 rounded-lg border ${
                  game.is_winner
                    ? 'bg-green-900/20 border-green-500'
                    : 'bg-red-900/20 border-red-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${
                          game.is_winner
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {game.is_winner ? 'WON' : 'LOST'}
                      </span>
                      <span className="text-sm text-gray-400">
                        {getGameModeLabel(game.game_mode)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">vs</span>
                        <span className="font-semibold">{game.opponent_username}</span>
                      </div>
                      <div className="text-gray-400">
                        {game.turn_count} turns
                      </div>
                      <div className="text-gray-400">
                        {formatDuration(game.duration_seconds)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-500">
                    {formatDate(game.ended_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {gameHistory.length > 0 && (
          <button
            onClick={() => fetchGameData()}
            className="mt-4 btn-secondary w-full"
          >
            Refresh History
          </button>
        )}
      </div>
    </div>
  );
};

export default GameHistory;
