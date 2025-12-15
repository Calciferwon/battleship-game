import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useLobbyStore from '../stores/lobbyStore';

const Lobby = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  
  // Lobby store state and actions
  const {
    rooms,
    isLoading,
    error,
    subscribed,
    loadRooms,
    createRoom,
    joinRoom,
    quickMatch,
    subscribeToLobby,
    unsubscribeFromLobby,
    clearError,
    refreshRooms
  } = useLobbyStore();

  useEffect(() => {
    // Load rooms and subscribe to lobby updates
    const initializeLobby = async () => {
      if (!user || !session) {
        console.log('⏳ Lobby: Waiting for user session...');
        console.log('⏳ Lobby: user:', user);
        console.log('⏳ Lobby: session:', session);
        return;
      }

      console.log('👤 Lobby: User session found:', { 
        userId: user.id, 
        hasToken: !!session?.access_token,
        sessionKeys: session ? Object.keys(session) : [],
        session: session
      });

      try {
        // Initialize the realtime service with user session
        const { init } = useLobbyStore.getState();
        console.log('🔗 Lobby: Initializing realtime service...');
        // Pass the user object and set the session separately
        await init(user, session);
        
        console.log('📋 Lobby: Loading rooms...');
        // Load initial rooms
        await loadRooms();
        console.log('✅ Lobby: Rooms loaded:', rooms);
        
        // Subscribe to lobby updates
        if (!subscribed) {
          console.log('🔔 Lobby: Subscribing to lobby updates...');
          subscribeToLobby();
        }
      } catch (error) {
        console.error('❌ Lobby: Failed to initialize lobby:', error);
        // Show more detailed error
        if (error.message) {
          console.error('Error message:', error.message);
        }
        if (error.response) {
          console.error('Error response:', error.response);
        }
      }
    };

    initializeLobby();

    // Cleanup on unmount
    return () => {
      unsubscribeFromLobby();
    };
  }, [user, session]);

  const handleCreateRoom = async (isPrivate = false) => {
    try {
      clearError();
      console.log('🏠 Creating room (private:', isPrivate, ')');
      const room = await createRoom(isPrivate);
      console.log('✅ Room created successfully:', room);
      if (room && room.id) {
        navigate(`/game/${room.id}`);
      } else {
        console.error('❌ Invalid room object returned:', room);
        throw new Error('Invalid room data received');
      }
    } catch (error) {
      console.error('❌ Failed to create room:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      clearError();
      console.log('🎮 Joining room:', roomId);
      const room = await joinRoom(roomId);
      console.log('✅ Room joined successfully:', room);
      if (room && room.id) {
        navigate(`/game/${room.id}`);
      } else {
        console.error('❌ Invalid room object returned:', room);
        throw new Error('Invalid room data received');
      }
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  };

  const handleQuickMatch = async () => {
    try {
      clearError();
      console.log('⚡ Starting quick match...');
      const room = await quickMatch();
      console.log('✅ Quick match room:', room);
      if (room && room.id) {
        navigate(`/game/${room.id}`);
      } else {
        console.error('❌ Invalid room object returned:', room);
        throw new Error('Invalid room data received');
      }
    } catch (error) {
      console.error('❌ Failed to quick match:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  };

  const formatDate = (timestamp) => {
    const now = new Date();
    const gameDate = new Date(timestamp);
    const diff = now - gameDate;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    return gameDate.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-navy-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Game Lobby</h1>
          <p className="text-gray-400">
            Create a new game or join an existing room
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={handleQuickMatch}
            disabled={isLoading}
            className="btn-primary p-6 text-lg"
          >
            <div className="text-3xl mb-2">⚡</div>
            <div className="font-bold">Quick Match</div>
            <div className="text-sm opacity-75 mt-1">
              Join or create a game instantly
            </div>
          </button>

          <button
            onClick={() => navigate('/ai-game')}
            className="p-6 text-lg bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            <div className="text-3xl mb-2">🤖</div>
            <div className="font-bold">Play vs AI</div>
            <div className="text-sm opacity-75 mt-1">
              Practice against the computer
            </div>
          </button>

          <button
            onClick={() => handleCreateRoom(false)}
            disabled={isLoading}
            className="btn-secondary p-6 text-lg"
          >
            <div className="text-3xl mb-2">🎮</div>
            <div className="font-bold">Create Public Room</div>
            <div className="text-sm opacity-75 mt-1">
              Anyone can join your game
            </div>
          </button>

          <button
            onClick={() => handleCreateRoom(true)}
            disabled={isLoading}
            className="btn-secondary p-6 text-lg"
          >
            <div className="text-3xl mb-2">🔒</div>
            <div className="font-bold">Create Private Room</div>
            <div className="text-sm opacity-75 mt-1">
              Share link with friends
            </div>
          </button>
        </div>

        {/* Room List */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Available Rooms</h2>
            <button
              onClick={refreshRooms}
              disabled={isLoading}
              className="text-sm text-ocean-400 hover:text-ocean-300 disabled:opacity-50"
            >
              🔄 Refresh
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎲</div>
              <p className="text-xl text-gray-400 mb-2">No rooms available</p>
              <p className="text-sm text-gray-500">
                Be the first to create a game!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 bg-navy-700 rounded-lg hover:bg-navy-600 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">🎯</div>
                      <div>
                        <p className="font-semibold text-white">
                          {room.player1_username}'s Game
                        </p>
                        <p className="text-sm text-gray-400">
                          Created {formatDate(room.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right mr-4">
                      <div className="text-sm text-gray-400">Players</div>
                      <div className="text-lg font-bold text-white">
                        {room.player2_id ? '2' : '1'}/2
                      </div>
                    </div>

                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={isLoading || room.player2_id !== null}
                      className="btn-primary px-6 py-2"
                    >
                      {room.player2_id ? 'Full' : 'Join Game'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
