import { io } from 'socket.io-client';
import { supabase } from './supabase';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

/**
 * Initialize socket connection with authentication
 */
export const initSocket = async () => {
  try {
    // Get current session token
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No active session');
    }

    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
    }

    // Create new socket connection with auth token
    socket = io(SOCKET_URL, {
      auth: {
        token: session.access_token,
      },
      autoConnect: true,
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('welcome', (data) => {
      console.log('👋 Welcome message:', data);
    });

    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    throw error;
  }
};

/**
 * Get current socket instance
 */
export const getSocket = () => {
  if (!socket) {
    console.warn('Socket not initialized. Call initSocket() first.');
  }
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = () => {
  return socket && socket.connected;
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  isSocketConnected,
};
