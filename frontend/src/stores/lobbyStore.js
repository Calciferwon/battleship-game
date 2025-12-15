import { create } from 'zustand';
import realtimeGameService from '../services/realtimeGameService';

const useLobbyStore = create((set, get) => ({
  // State
  rooms: [],
  isLoading: false,
  error: null,
  subscribed: false,

  // Actions

  /**
   * Initialize lobby service
   */
  init: async (user, session) => {
    await realtimeGameService.init(user);
    if (session) {
      realtimeGameService.setSession(session);
    }
  },

  /**
   * Subscribe to lobby events
   */
  subscribeToLobby: () => {
    if (get().subscribed) return;

    const handlers = {
      onRoomCreated: (room) => {
        console.log('🏠 New room created:', room);
        if (!room.is_private && room.status === 'waiting') {
          set((state) => ({
            rooms: [...state.rooms, room]
          }));
        }
      },

      onRoomUpdated: (newRoom, oldRoom) => {
        console.log('🔄 Room updated:', newRoom, oldRoom);
        set((state) => ({
          rooms: state.rooms.map(room => 
            room.id === newRoom.id ? newRoom : room
          ).filter(room => 
            // Remove rooms that are no longer available
            !room.is_private && room.status === 'waiting'
          )
        }));
      },

      onRoomDeleted: (deletedRoom) => {
        console.log('🗑️ Room deleted:', deletedRoom);
        set((state) => ({
          rooms: state.rooms.filter(room => room.id !== deletedRoom.id)
        }));
      }
    };

    realtimeGameService.subscribeToLobby(handlers);
    set({ subscribed: true });
  },

  /**
   * Unsubscribe from lobby events
   */
  unsubscribeFromLobby: () => {
    realtimeGameService.unsubscribe('lobby');
    set({ subscribed: false });
  },

  /**
   * Load available rooms
   */
  loadRooms: async () => {
    try {
      console.log('🔄 lobbyStore: Starting loadRooms()...');
      set({ isLoading: true, error: null });
      
      const result = await realtimeGameService.getRooms();
      console.log('📦 lobbyStore: getRooms() returned:', result);
      const { rooms } = result;
      console.log('📊 lobbyStore: Extracted rooms array:', rooms);
      console.log('📈 lobbyStore: Room count:', rooms ? rooms.length : 0);
      
      set({ rooms: rooms || [] });
      console.log('✅ lobbyStore: Rooms stored in state');
    } catch (error) {
      console.error('❌ lobbyStore: Error loading rooms:', error);
      console.error('❌ lobbyStore: Error details:', {
        message: error.message,
        stack: error.stack
      });
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Create a new room
   */
  createRoom: async (isPrivate = false) => {
    try {
      console.log('🏠 lobbyStore.createRoom: Starting...', { isPrivate });
      set({ isLoading: true, error: null });
      
      console.log('🏠 lobbyStore.createRoom: Calling realtimeGameService.createRoom...');
      const result = await realtimeGameService.createRoom(isPrivate);
      console.log('🏠 lobbyStore.createRoom: Result:', result);
      return result.room;
    } catch (error) {
      console.error('❌ lobbyStore.createRoom: Error:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
      console.log('🏠 lobbyStore.createRoom: Completed');
    }
  },

  /**
   * Join an existing room
   */
  joinRoom: async (roomId) => {
    try {
      set({ isLoading: true, error: null });
      
      const result = await realtimeGameService.joinRoom(roomId);
      
      // Remove room from available rooms list
      set((state) => ({
        rooms: state.rooms.filter(room => room.id !== roomId)
      }));
      
      return result.room;
    } catch (error) {
      console.error('Error joining room:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Quick match - join first available room or create new one
   */
  quickMatch: async () => {
    try {
      const { rooms } = get();
      
      if (rooms.length > 0) {
        // Join first available room
        return await get().joinRoom(rooms[0].id);
      } else {
        // Create new public room
        return await get().createRoom(false);
      }
    } catch (error) {
      console.error('Error in quick match:', error);
      throw error;
    }
  },

  /**
   * Refresh rooms list
   */
  refreshRooms: async () => {
    await get().loadRooms();
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Reset store
   */
  reset: () => {
    get().unsubscribeFromLobby();
    set({
      rooms: [],
      isLoading: false,
      error: null,
      subscribed: false
    });
  }
}));

export default useLobbyStore;