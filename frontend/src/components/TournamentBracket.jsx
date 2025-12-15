import { useEffect, useState } from 'react';
import useTournamentStore from '../stores/tournamentStore';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import { Crown, Clock, Trophy, Swords } from 'lucide-react';

const TournamentBracket = ({ tournamentId }) => {
  const { user } = useAuth();
  const { currentBracket } = useTournamentStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('🏆 TournamentBracket: currentBracket available:', currentBracket?.length || 0);
    
    // Only fetch if bracket is not already loaded
    if (!currentBracket || currentBracket.length === 0) {
      const loadBracket = async () => {
        try {
          console.log('🏆 TournamentBracket: Fetching bracket...');
          setIsLoading(true);
          const store = useTournamentStore.getState();
          await store.fetchTournamentBracket(tournamentId);
          console.log('🏆 TournamentBracket: Bracket fetch complete');
        } catch (error) {
          console.error('Error loading bracket:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadBracket();
    }
  }, [tournamentId]);

  // Show loading if we're actively fetching AND bracket is empty
  if (isLoading && (!currentBracket || currentBracket.length === 0)) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!currentBracket || currentBracket.length === 0) {
    console.log('🏆 TournamentBracket: No bracket data, showing empty state');
    return (
      <div className="text-center py-12 text-gray-400">
        <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>No bracket data available</p>
      </div>
    );
  }

  // Group matches by round
  const matchesByRound = {};
  const rounds = new Set();
  
  currentBracket.forEach((match) => {
    rounds.add(match.round);
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = [];
    }
    matchesByRound[match.round].push(match);
  });

  const sortedRounds = Array.from(rounds).sort((a, b) => a - b);
  const totalRounds = Math.max(...sortedRounds);

  const getRoundName = (roundNumber, totalRounds) => {
    const roundsFromEnd = totalRounds - roundNumber;
    if (roundsFromEnd === 0) return 'Finals';
    if (roundsFromEnd === 1) return 'Semi-Finals';
    if (roundsFromEnd === 2) return 'Quarter-Finals';
    return `Round ${roundNumber}`;
  };

  const getMatchStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'border-gray-600 bg-navy-700';
      case 'ready': return 'border-green-500 bg-green-900/20';
      case 'in_progress': return 'border-blue-500 bg-blue-900/20 animate-pulse';
      case 'completed': return 'border-gray-700 bg-navy-800';
      case 'forfeited': return 'border-red-500 bg-red-900/20';
      default: return 'border-gray-600 bg-navy-700';
    }
  };

  const getMatchStatusIcon = (status) => {
    switch (status) {
      case 'in_progress': return <Swords className="w-4 h-4 text-blue-400" />;
      case 'completed': return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'ready': return <Clock className="w-4 h-4 text-green-400" />;
      default: return null;
    }
  };

  const isUserMatch = (match) => {
    return match.player1_id === user?.id || match.player2_id === user?.id;
  };

  const getPlayerDisplay = (player, isWinner) => {
    if (!player) {
      return <span className="text-gray-500 italic text-sm">TBD</span>;
    }

    return (
      <div className={`flex items-center justify-between ${isWinner ? 'font-bold text-yellow-400' : ''}`}>
        <span className="truncate">{player.username}</span>
        {isWinner && <Crown className="w-4 h-4 ml-2" />}
      </div>
    );
  };

  const MatchCard = ({ match, roundNumber, totalRounds }) => {
    const isWinner1 = match.winner_id === match.player1_id;
    const isWinner2 = match.winner_id === match.player2_id;
    const userInMatch = isUserMatch(match);

    return (
      <div
        className={`relative border-2 rounded-lg p-4 transition-all ${getMatchStatusColor(
          match.status
        )} ${userInMatch ? 'ring-2 ring-blue-400' : ''}`}
        style={{ minWidth: '200px' }}
      >
        {/* Match Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-400">
            {match.bracket_position || `M${match.match_number}`}
          </span>
          {getMatchStatusIcon(match.status)}
        </div>

        {/* Players */}
        <div className="space-y-2">
          <div
            className={`p-2 rounded ${
              isWinner1 ? 'bg-yellow-900/30' : 'bg-navy-900/50'
            }`}
          >
            {getPlayerDisplay(match.player1, isWinner1)}
          </div>
          
          <div className="text-center text-gray-600 text-xs">vs</div>
          
          <div
            className={`p-2 rounded ${
              isWinner2 ? 'bg-yellow-900/30' : 'bg-navy-900/50'
            }`}
          >
            {getPlayerDisplay(match.player2, isWinner2)}
          </div>
        </div>

        {/* Match Status Badge */}
        {match.status !== 'pending' && (
          <div className="mt-3 text-center">
            <span
              className={`text-xs px-2 py-1 rounded ${
                match.status === 'completed'
                  ? 'bg-green-500 text-white'
                  : match.status === 'in_progress'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-500 text-white'
              }`}
            >
              {match.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        )}

        {userInMatch && (
          <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            YOU
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="inline-flex space-x-8 min-w-full">
        {sortedRounds.map((roundNum) => (
          <div key={roundNum} className="flex flex-col space-y-4">
            {/* Round Header */}
            <div className="text-center mb-2 sticky top-0 bg-navy-800 py-2 z-10">
              <h3 className="text-lg font-bold">
                {getRoundName(roundNum, totalRounds)}
              </h3>
              <p className="text-xs text-gray-400">
                {matchesByRound[roundNum].filter((m) => m.status === 'completed').length} /{' '}
                {matchesByRound[roundNum].length} completed
              </p>
            </div>

            {/* Matches */}
            <div className="flex flex-col space-y-8">
              {matchesByRound[roundNum].map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  roundNumber={roundNum}
                  totalRounds={totalRounds}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 p-4 bg-navy-700 rounded-lg">
        <h4 className="text-sm font-semibold mb-3">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-gray-600 bg-navy-700 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-green-500 bg-green-900/20 rounded"></div>
            <span>Ready</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 bg-blue-900/20 rounded"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-gray-700 bg-navy-800 rounded"></div>
            <span>Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentBracket;
