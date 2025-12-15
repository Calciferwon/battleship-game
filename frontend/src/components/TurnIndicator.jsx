import { useEffect, useState } from 'react';

const TurnIndicator = ({ isMyTurn, myUsername, opponentUsername, turnCount }) => {
  const [timeLeft, setTimeLeft] = useState(30);

  // Reset timer when turn changes
  useEffect(() => {
    setTimeLeft(30);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 30; // Reset (in real game, this would trigger auto-pass)
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isMyTurn, turnCount]);

  const getTimerColor = () => {
    if (timeLeft > 20) return 'text-green-400';
    if (timeLeft > 10) return 'text-yellow-400';
    return 'text-red-400 animate-pulse';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        {/* Turn Info */}
        <div className="flex-1">
          {isMyTurn ? (
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <p className="text-2xl font-bold text-white">Your Turn!</p>
                <p className="text-sm text-gray-400">Select a target on the opponent's board</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold text-gray-400">Opponent's Turn</p>
                <p className="text-sm text-gray-500">
                  Waiting for {opponentUsername || 'opponent'}...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <div className={`text-4xl font-bold ${getTimerColor()}`}>{timeLeft}</div>
          <div className="text-xs text-gray-500">seconds</div>
        </div>
      </div>

      {/* Turn Count */}
      <div className="mt-4 pt-4 border-t border-navy-700">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Turn #{turnCount}</span>
          <span className="text-gray-400">
            {myUsername} vs {opponentUsername}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TurnIndicator;
