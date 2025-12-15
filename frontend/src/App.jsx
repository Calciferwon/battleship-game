import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './components/Home';
import Profile from './components/Profile';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import GameBoard from './components/GameBoard';
import AIGameScreen from './components/AIGameScreen';
import TournamentLobby from './components/TournamentLobby';
import TournamentDetails from './components/TournamentDetails';
import TournamentMatchWaiting from './components/TournamentMatchWaiting';
import TournamentShipPlacement from './components/TournamentShipPlacement';
import TournamentGamePlay from './components/TournamentGamePlay';
import TournamentHistory from './components/TournamentHistory';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import useAuthStore from './stores/authStore';
import realtimeGameService from './services/realtimeGameService';
import useGameStore from './stores/gameStoreRealtime';
import useLobbyStore from './stores/lobbyStore';
import useTournamentStore from './stores/tournamentStore';

function App() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const session = useAuthStore((state) => state.session);
  const initService = useGameStore((state) => state.initService);
  const initLobby = useLobbyStore((state) => state.init);
  const initTournament = useTournamentStore((state) => state.init);
  const resetGame = useGameStore((state) => state.resetGame);
  const resetLobby = useLobbyStore((state) => state.reset);
  const initialized = useRef(false);

  // Initialize realtime services when user is authenticated (only once)
  useEffect(() => {
    if (isAuthenticated && user && session && !isLoading && !initialized.current) {
      console.log('🔗 Initializing realtime services for user:', user.id);
      initialized.current = true;
      
      // Initialize all services (all use Supabase Realtime now)
      Promise.all([
        initService(user, session),
        initLobby(user, session),
        initTournament()
      ]).catch((error) => {
        console.error('Failed to initialize realtime services:', error);
      });
    }

    // Cleanup only when component unmounts or user logs out
    return () => {
      if (initialized.current && !isAuthenticated) {
        console.log('🔇 Cleaning up realtime services');
        realtimeGameService.unsubscribeAll();
        resetGame();
        resetLobby();
        initialized.current = false;
      }
    };
  }, [isAuthenticated, user, session, isLoading]);

  return (
    <>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />

        {/* Profile Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={<Profile />}
        />

        {/* Game Routes */}
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:gameId"
          element={
            <ProtectedRoute>
              <GameScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-game"
          element={
            <ProtectedRoute>
              <AIGameScreen />
            </ProtectedRoute>
          }
        />

        {/* Tournament Routes */}
        <Route
          path="/tournaments"
          element={
            <ProtectedRoute>
              <TournamentLobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournament/:tournamentId"
          element={
            <ProtectedRoute>
              <TournamentDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournament-match/:matchId"
          element={
            <ProtectedRoute>
              <TournamentMatchWaiting />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournament-ship-placement/:matchId"
          element={
            <ProtectedRoute>
              <TournamentShipPlacement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournament-game-play/:matchId"
          element={
            <ProtectedRoute>
              <TournamentGamePlay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournament-game/:matchId"
          element={
            <ProtectedRoute>
              <TournamentGamePlay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournament-history"
          element={
            <ProtectedRoute>
              <TournamentHistory />
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-navy-900 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                <p className="text-xl text-gray-400 mb-8">Page not found</p>
                <a href="/" className="btn-primary">
                  Go Home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>

    {/* Toast Notification Container */}
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
      style={{ zIndex: 9999 }}
    />
  </>
  );
}

export default App;
