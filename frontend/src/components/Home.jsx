import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, profile, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const handleShowAuth = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Header */}
      <header className="bg-navy-800 border-b border-navy-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🚢</div>
              <h1 className="text-2xl font-bold text-white">Battleship PvP</h1>
            </div>

            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate('/profile')}
                    className="text-right hover:bg-navy-700 rounded-lg p-2 transition-colors"
                  >
                    <p className="text-white font-medium">{profile?.username || 'Player'}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </button>
                  <button onClick={signOut} className="btn-secondary">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleShowAuth('login')}
                    className="btn-secondary"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleShowAuth('signup')}
                    className="btn-primary"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <h2 className="text-5xl font-bold text-white mb-4">
              Challenge Your Friends to Battle!
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              The classic naval strategy game, now online and multiplayer
            </p>

            {isAuthenticated ? (
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => navigate('/lobby')}
                  className="btn-primary text-lg px-8 py-3"
                >
                  Play Now
                </button>
                <button
                  onClick={() => navigate('/tournaments')}
                  className="btn-secondary text-lg px-8 py-3 flex items-center space-x-2"
                >
                  <span>🏆</span>
                  <span>Tournaments</span>
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="btn-secondary text-lg px-8 py-3"
                >
                  View Profile
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleShowAuth('signup')}
                className="btn-primary text-lg px-8 py-3"
              >
                Get Started - It's Free!
              </button>
            )}
          </div>

          {/* Stats (if authenticated) */}
          {isAuthenticated && profile && (
            <div className="card mb-12">
              <h3 className="text-2xl font-bold text-white mb-6">Your Stats</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-400">{profile.wins}</p>
                  <p className="text-sm text-gray-400">Wins</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-400">{profile.losses}</p>
                  <p className="text-sm text-gray-400">Losses</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-ocean-400">{profile.games_played}</p>
                  <p className="text-sm text-gray-400">Games Played</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">
                    {profile.games_played > 0
                      ? `${((profile.wins / profile.games_played) * 100).toFixed(1)}%`
                      : '0%'}
                  </p>
                  <p className="text-sm text-gray-400">Win Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="card">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">Real-Time Battles</h3>
              <p className="text-gray-400">
                Instant gameplay with WebSocket technology for seamless multiplayer
              </p>
            </div>
            <div className="card">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-white mb-2">AI Opponent</h3>
              <p className="text-gray-400">
                Practice against smart AI with multiple difficulty levels
              </p>
            </div>
            <div className="card">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-white mb-2">Tournaments</h3>
              <p className="text-gray-400">
                Compete in tournaments and climb the leaderboard
              </p>
            </div>
            <div className="card">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-white mb-2">In-Game Chat</h3>
              <p className="text-gray-400">
                Communicate with your opponent during matches
              </p>
            </div>
          </div>

          {/* How to Play */}
          <div className="card text-left">
            <h3 className="text-2xl font-bold text-white mb-4">How to Play</h3>
            <ol className="space-y-2 text-gray-300">
              <li>1. Place your 5 ships on your board (Carrier, Battleship, Cruiser, Submarine, Destroyer)</li>
              <li>2. Take turns attacking coordinates on your opponent's board</li>
              <li>3. First player to sink all opponent's ships wins!</li>
            </ol>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </div>
  );
};

export default Home;
