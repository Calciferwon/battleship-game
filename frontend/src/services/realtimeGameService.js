import { supabase } from './supabase.js';

class RealtimeGameService {
  constructor() {
    this.channels = new Map();
    this.eventHandlers = new Map();
    this.user = null;
    this.session = null;
  }

  // Initialize with user authentication
  async init(user) {
    console.log('🔗 init: Starting with user:', user?.id);
    this.user = user;
    console.log('✅ init: User stored, service ready');
  }

  // Set session (to be called from outside)
  setSession(session) {
    console.log('🔑 setSession: Setting session');
    this.session = session;
  }

  // Get auth headers for API requests
  async getAuthHeaders() {
    console.log('🔑 getAuthHeaders: Starting...');
    try {
      // First try to use cached session
      if (this.session && this.session.access_token) {
        console.log('✅ Using cached session access token');
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.session.access_token}`
        };
      }

      // Fallback: get fresh session from Supabase
      console.log('🔄 Getting fresh session from Supabase...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('🔑 getAuthHeaders: Got session result:', { hasSession: !!session, error });
      
      if (error) {
        console.error('❌ Failed to get session:', error);
        throw new Error('Failed to get authentication session: ' + error.message);
      }
      
      if (!session || !session.access_token) {
        console.error('❌ No active session or access token');
        console.error('❌ User object:', this.user);
        throw new Error('No authentication token available. Please log in again.');
      }
      
      // Cache the session for next time
      this.session = session;
      
      console.log('✅ Using access token for API request');
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };
    } catch (error) {
      console.error('❌ getAuthHeaders error:', error);
      throw error;
    }
  }

  // Make API request to backend
  async apiRequest(action, method = 'GET', data = null) {
    const baseUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    const url = `${baseUrl}/api/game?action=${action}`;
    
    console.log(`🌐 API Request: ${method} ${url}`);
    if (data) console.log('📤 Request data:', data);
    
    const options = {
      method,
      headers: await this.getAuthHeaders() // await the async getAuthHeaders
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      console.log('⏳ Sending request...');
      const response = await fetch(url, options);
      console.log('📡 Response status:', response.status, response.statusText);
      
      const result = await response.json();
      console.log('📥 Response data:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'API request failed');
      }
      
      return result;
    } catch (error) {
      console.error(`❌ API request failed for ${action}:`, error);
      throw error;
    }
  }

  // Subscribe to real-time events for a specific room/game
  subscribeToRoom(roomId, handlers = {}) {
    console.log('🔔 Subscribing to room:', roomId);
    console.log('🔔 Subscription filter: room_id=eq.' + roomId);
    console.log('🔔 Current user:', this.user?.id);

    // Subscribe to game events
    const gameEventsChannel = supabase
      .channel(`game_events_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('🎮 Game event received (RAW):', payload);
          console.log('🎮 Game event data:', payload.new);
          this.handleGameEvent(payload.new, handlers);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('💬 Chat message received:', payload.new);
          this.handleChatMessage(payload.new, handlers);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Room subscription status for ${roomId}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Successfully subscribed to room: ${roomId}`);
          console.log(`✅ Listening for events with filter: room_id=eq.${roomId}`);
          console.log(`✅ User ID: ${this.user?.id}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Failed to subscribe to room: ${roomId}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ Subscription timed out for room: ${roomId}`);
        } else if (status === 'CLOSED') {
          console.warn(`🔒 Subscription closed for room: ${roomId}`);
        }
      });

    this.channels.set(`room_${roomId}`, gameEventsChannel);
    return gameEventsChannel;
  }

  // Subscribe to game events by game ID
  subscribeToGame(gameId, handlers = {}) {
    console.log('🔔 Subscribing to game:', gameId);

    const gameChannel = supabase
      .channel(`game_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          console.log('🎮 Game event received:', payload.new);
          this.handleGameEvent(payload.new, handlers);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          console.log('💬 Chat message received:', payload.new);
          this.handleChatMessage(payload.new, handlers);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Game subscription status for ${gameId}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Successfully subscribed to game: ${gameId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Failed to subscribe to game: ${gameId}`);
        }
      });

    this.channels.set(`game_${gameId}`, gameChannel);
    return gameChannel;
  }

  // Subscribe to lobby events (public rooms)
  subscribeToLobby(handlers = {}) {
    console.log('🏠 Subscribing to lobby');

    const lobbyChannel = supabase
      .channel('lobby')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms'
        },
        (payload) => {
          console.log('🏠 Lobby event received:', payload);
          this.handleLobbyEvent(payload, handlers);
        }
      )
      .subscribe();

    this.channels.set('lobby', lobbyChannel);
    return lobbyChannel;
  }

  // Handle game events
  handleGameEvent(event, handlers) {
    const { event_type, event_data, user_id } = event;

    console.log('🎯 handleGameEvent:', { event_type, event_data, user_id, myUserId: this.user?.id });

    // Don't handle events from the same user for certain event types
    // But DO handle attack_made events from yourself for turn sync
    if (user_id === this.user?.id && event_type !== 'attack_made') {
      console.log('⏭️ Skipping event from same user:', event_type);
      return;
    }

    switch (event_type) {
      case 'room_created':
        handlers.onRoomCreated?.(event_data);
        break;
      case 'room_joined':
        handlers.onRoomJoined?.(event_data);
        break;
      case 'player_left':
        handlers.onPlayerLeft?.(event_data);
        break;
      case 'ships_placed':
        handlers.onShipsPlaced?.(event_data);
        break;
      case 'game_started':
        handlers.onGameStarted?.(event_data);
        break;
      case 'attack_made':
        handlers.onAttackMade?.(event_data);
        break;
      case 'game_over':
        handlers.onGameOver?.(event_data);
        break;
      default:
        console.log('Unhandled game event:', event_type, event_data);
    }
  }

  // Handle chat messages
  handleChatMessage(message, handlers) {
    // Don't show messages from the same user
    if (message.user_id === this.user?.id) return;

    handlers.onChatMessage?.(message);
  }

  // Handle lobby events
  handleLobbyEvent(payload, handlers) {
    const { eventType, new: newData, old: oldData } = payload;

    switch (eventType) {
      case 'INSERT':
        handlers.onRoomCreated?.(newData);
        break;
      case 'UPDATE':
        handlers.onRoomUpdated?.(newData, oldData);
        break;
      case 'DELETE':
        handlers.onRoomDeleted?.(oldData);
        break;
    }
  }

  // Unsubscribe from a channel
  unsubscribe(channelKey) {
    const channel = this.channels.get(channelKey);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelKey);
      console.log('🔇 Unsubscribed from:', channelKey);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    for (const [key, channel] of this.channels) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();
    console.log('🔇 Unsubscribed from all channels');
  }

  // === GAME API METHODS ===

  // Get available rooms
  async getRooms() {
    console.log('🌐 realtimeGameService: Calling getRooms API...');
    const result = await this.apiRequest('getRooms');
    console.log('📦 realtimeGameService: getRooms API response:', result);
    return result;
  }

  // Create a new room
  async createRoom(isPrivate = false) {
    console.log('🏠 realtimeGameService.createRoom: Starting...', { isPrivate });
    const result = await this.apiRequest('createRoom', 'POST', { isPrivate });
    console.log('🏠 realtimeGameService.createRoom: Result:', result);
    return result;
  }

  // Join a room
  async joinRoom(roomId) {
    return this.apiRequest('joinRoom', 'POST', { roomId });
  }

  // Leave a room
  async leaveRoom(roomId) {
    return this.apiRequest('leaveRoom', 'POST', { roomId });
  }

  // Place ships
  async placeShips(roomId, ships, board) {
    return this.apiRequest('placeShips', 'POST', { roomId, ships, board });
  }

  // Make an attack
  async attack(roomId, x, y) {
    return this.apiRequest('attack', 'POST', { roomId, x, y });
  }

  // Get current game state
  async getGameState(roomId) {
    const baseUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    const url = `${baseUrl}/api/game?action=getGameState&roomId=${roomId}`;
    
    const options = {
      method: 'GET',
      headers: await this.getAuthHeaders()
    };

    try {
      const response = await fetch(url, options);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'API request failed');
      }
      
      return result;
    } catch (error) {
      console.error(`API request failed for getGameState:`, error);
      throw error;
    }
  }

  // Send chat message
  async sendMessage(roomId, gameId, message) {
    return this.apiRequest('sendMessage', 'POST', { roomId, gameId, message });
  }

  // Send chat message (simplified method for game context)
  async sendChatMessage(roomId, gameId, message) {
    return this.sendMessage(roomId, gameId, message);
  }

  // Get chat messages for a room
  async getChatMessages(roomId) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching chat messages:', error);
      return [];
    }
  }

  // Subscribe to chat messages for a specific room/game
  subscribeToChatMessages(roomId, onMessage) {
    console.log('🔔 Subscribing to chat messages for room:', roomId);

    const chatChannel = supabase
      .channel(`chat_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('💬 Chat message received:', payload.new);
          if (onMessage) {
            onMessage(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Chat subscription status for room', roomId, ':', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to chat for room:', roomId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Chat subscription error for room:', roomId);
        }
      });

    this.channels.set(`chat_${roomId}`, chatChannel);

    // Return unsubscribe function
    return () => {
      console.log('🔇 Unsubscribing from chat for room:', roomId);
      supabase.removeChannel(chatChannel);
      this.channels.delete(`chat_${roomId}`);
    };
  }

  // Get current user ID
  getCurrentUserId() {
    return this.user?.id;
  }
}

// Create singleton instance
export const realtimeGameService = new RealtimeGameService();
export default realtimeGameService;