import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useTournamentStore from '../stores/tournamentStore';
import LoadingSpinner from './LoadingSpinner';
import { Trophy, Medal, Target, TrendingUp, Calendar, Crown, Award } from 'lucide-react';

const TournamentHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userTournaments, fetchUserTournaments, isLoading } = useTournamentStore();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user) {
      fetchUserTournaments(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (userTournaments && userTournaments.length > 0) {
      calculateStats();
    }
  }, [userTournaments]);

  const calculateStats = () => {
    const completed = userTournaments.filter(t => t.status === 'completed');
    const wins = completed.filter(t => t.winner_id === user.id).length;
    const secondPlace = completed.filter(t => {
      const participant = t.participants?.find(p => p.user_id === user.id);
      return participant?.placement === 2;
    }).length;
    const thirdPlace = completed.filter(t => {
      const participant = t.participants?.find(p => p.user_id === user.id);
      return participant?.placement === 3;
    }).length;
    const totalMatches = completed.reduce((sum, t) => {
      const participant = t.participants?.find(p => p.user_id === user.id);
      return sum + (participant?.matches_won || 0) + (participant?.matches_lost || 0);
    }, 0);
    const matchesWon = completed.reduce((sum, t) => {
      const participant = t.participants?.find(p => p.user_id === user.id);
      return sum + (participant?.matches_won || 0);
    }, 0);
    const winRate = totalMatches > 0 ? ((matchesWon / totalMatches) * 100).toFixed(1) : 0;

    setStats({
      totalTournaments: userTournaments.length,
      completedTournaments: completed.length,
      activeTournaments: userTournaments.filter(t => t.status === 'active').length,
      wins,
      secondPlace,
      thirdPlace,
      totalMatches,
      matchesWon,
      matchesLost: totalMatches - matchesWon,
      winRate,
    });
  };

  const getPlacementBadge = (placement) => {
    switch (placement) {
      case 1:
        return (
          <div className="flex items-center space-x-1 text-yellow-400">
            <Crown className="w-5 h-5" />
            <span className="font-bold">1st Place</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center space-x-1 text-gray-300">
            <Medal className="w-5 h-5" />
            <span className="font-semibold">2nd Place</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center space-x-1 text-orange-400">
            <Award className="w-5 h-5" />
            <span className="font-semibold">3rd Place</span>
          </div>
        );
      default:
        return <span className="text-gray-400">Eliminated</span>;
    }
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
        return 'bg-gray-500';
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      {/* Header */}
      <header className="bg-navy-800 border-b border-navy-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/tournaments')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <div className="flex items-center space-x-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <h1 className="text-2xl font-bold">Tournament History</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Tournaments */}
            <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="w-8 h-8 text-blue-400" />
                <span className="text-3xl font-bold">{stats.totalTournaments}</span>
              </div>
              <p className="text-gray-400">Total Tournaments</p>
            </div>

            {/* Wins */}
            <div className="bg-navy-800 rounded-lg border border-yellow-500 p-6">
              <div className="flex items-center justify-between mb-2">
                <Crown className="w-8 h-8 text-yellow-400" />
                <span className="text-3xl font-bold text-yellow-400">{stats.wins}</span>
              </div>
              <p className="text-gray-400">Tournament Wins</p>
            </div>

            {/* Win Rate */}
            <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-400" />
                <span className="text-3xl font-bold text-green-400">{stats.winRate}%</span>
              </div>
              <p className="text-gray-400">Match Win Rate</p>
            </div>

            {/* Total Matches */}
            <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 text-purple-400" />
                <span className="text-3xl font-bold">{stats.totalMatches}</span>
              </div>
              <p className="text-gray-400">Total Matches</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.matchesWon}W - {stats.matchesLost}L
              </p>
            </div>
          </div>
        )}

        {/* Podium Stats */}
        {stats && (stats.wins > 0 || stats.secondPlace > 0 || stats.thirdPlace > 0) && (
          <div className="bg-navy-800 rounded-lg border border-navy-700 p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Podium Finishes</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-500">
                <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-yellow-400">{stats.wins}</p>
                <p className="text-sm text-gray-400">1st Place</p>
              </div>
              <div className="text-center p-4 bg-gray-800 rounded-lg border border-gray-600">
                <Medal className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-300">{stats.secondPlace}</p>
                <p className="text-sm text-gray-400">2nd Place</p>
              </div>
              <div className="text-center p-4 bg-orange-900/20 rounded-lg border border-orange-500">
                <Award className="w-12 h-12 text-orange-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-orange-400">{stats.thirdPlace}</p>
                <p className="text-sm text-gray-400">3rd Place</p>
              </div>
            </div>
          </div>
        )}

        {/* Tournament History List */}
        <div className="bg-navy-800 rounded-lg border border-navy-700 p-6">
          <h2 className="text-xl font-bold mb-4">Tournament History</h2>
          
          {userTournaments && userTournaments.length > 0 ? (
            <div className="space-y-4">
              {userTournaments.map((tournament) => {
                const participant = tournament.participants?.find(p => p.user_id === user.id);
                const isWinner = tournament.winner_id === user.id;
                
                return (
                  <div
                    key={tournament.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-blue-500 ${
                      isWinner
                        ? 'bg-yellow-900/20 border-yellow-500'
                        : 'bg-navy-700 border-navy-600'
                    }`}
                    onClick={() => navigate(`/tournament/${tournament.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-bold">{tournament.name}</h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                              tournament.status
                            )}`}
                          >
                            {tournament.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(tournament.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Trophy className="w-4 h-4" />
                            <span>{tournament.current_players} players</span>
                          </div>
                        </div>
                      </div>

                      {tournament.status === 'completed' && participant && (
                        <div className="text-right">
                          {getPlacementBadge(participant.placement)}
                          {participant.matches_won !== undefined && (
                            <p className="text-xs text-gray-400 mt-1">
                              {participant.matches_won}W - {participant.matches_lost}L
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No tournament history yet</p>
              <button
                onClick={() => navigate('/tournaments')}
                className="mt-4 btn-primary"
              >
                Join a Tournament
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentHistory;
