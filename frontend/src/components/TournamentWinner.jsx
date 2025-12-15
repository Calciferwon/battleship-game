import { useEffect, useState } from 'react';
import { Trophy, Sparkles } from 'lucide-react';

const TournamentWinner = ({ 
  winnerId, 
  winnerName, 
  tournamentName,
  isCurrentUser = false,
  onClose = () => {} 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [confetti, setConfetti] = useState([]);

  // Generate confetti particles
  useEffect(() => {
    const particles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1,
    }));
    setConfetti(particles);
  }, []);

  // Auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500); // Wait for fade out animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Confetti */}
      {confetti.map(particle => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full pointer-events-none"
          style={{
            left: `${particle.left}%`,
            top: '-10px',
            animation: `fall ${particle.duration}s linear ${particle.delay}s forwards`,
          }}
        />
      ))}

      {/* Main Content */}
      <div className="text-center">
        {/* Trophy Animation */}
        <div className="mb-8 relative inline-block">
          <div className="absolute inset-0 animate-pulse">
            <Trophy className="w-32 h-32 text-yellow-400 mx-auto" fill="currentColor" />
          </div>
          <Trophy className="w-32 h-32 text-yellow-300 mx-auto relative z-10" fill="currentColor" />
        </div>

        {/* Congratulations Message */}
        <div className="space-y-6">
          <div>
            <h2 className="text-5xl font-bold text-yellow-300 mb-2 animate-bounce">
              🎉 CHAMPION 🎉
            </h2>
            <p className="text-3xl font-bold text-white mb-4">
              {isCurrentUser ? '🏆 YOU WON! 🏆' : `${winnerName} is the Champion!`}
            </p>
          </div>

          {/* Tournament Name */}
          {tournamentName && (
            <div>
              <p className="text-lg text-gray-300">
                {tournamentName}
              </p>
            </div>
          )}

          {/* Sparkles Effect */}
          <div className="flex justify-center gap-2 text-yellow-400 text-2xl">
            <Sparkles className="w-8 h-8 animate-spin" />
            <span>Tournament Complete</span>
            <Sparkles className="w-8 h-8 animate-spin" style={{ animationDirection: 'reverse' }} />
          </div>

          {/* Celebration Message */}
          {isCurrentUser && (
            <p className="text-xl text-green-300 font-semibold">
              Congratulations on your Victory!
            </p>
          )}
        </div>

        {/* Closing Hint */}
        <p className="text-sm text-gray-400 mt-8 animate-pulse">
          Returning to tournament...
        </p>
      </div>

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) translateX(var(--tx, 0));
            opacity: 0;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};

export default TournamentWinner;
