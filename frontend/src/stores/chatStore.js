import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  // State
  messages: [],
  isTyping: false,
  isPanelOpen: true,
  unreadCount: 0,

  // Actions
  addMessage: (message) => set((state) => {
    // Check if message already exists to prevent duplicates
    if (state.messages.some(m => m.id === message.id)) {
      return state;
    }
    
    return {
      messages: [...state.messages, {
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
      }],
      unreadCount: state.isPanelOpen ? 0 : state.unreadCount + 1,
    };
  }),

  setTyping: (isTyping) => set({ isTyping }),

  togglePanel: () => set((state) => ({
    isPanelOpen: !state.isPanelOpen,
    unreadCount: !state.isPanelOpen ? 0 : state.unreadCount,
  })),

  closePanel: () => set({ isPanelOpen: false }),

  openPanel: () => set({ isPanelOpen: true, unreadCount: 0 }),

  clearMessages: () => set({ messages: [], unreadCount: 0 }),

  clearUnread: () => set({ unreadCount: 0 }),

  reset: () => set({
    messages: [],
    isTyping: false,
    isPanelOpen: true,
    unreadCount: 0,
  }),
}));
