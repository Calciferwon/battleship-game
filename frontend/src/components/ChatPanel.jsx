import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import useAuthStore from '../stores/authStore';
import { realtimeGameService } from '../services/realtimeGameService';
import { designTokens } from '../styles/designTokens';

console.log('💬💬💬 ChatPanel.jsx loaded - DEBUG VERSION v2');

const ChatPanel = ({ roomId, gameId }) => {
  const [message, setMessage] = useState('');
  const [isTypingTimeout, setIsTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);

  const { messages, isTyping, isPanelOpen, unreadCount, addMessage, setTyping, togglePanel, clearUnread, clearMessages } = useChatStore();
  const { user } = useAuthStore();

  console.log('💬 ChatPanel: Rendered with props:', { roomId, gameId, isPanelOpen });

  // Load existing chat messages when component mounts or roomId changes
  useEffect(() => {
    if (!roomId) return;

    // Clear previous messages when roomId changes
    clearMessages();

    const loadMessages = async () => {
      try {
        const existingMessages = await realtimeGameService.getChatMessages(roomId);
        existingMessages.forEach((msg) => {
          addMessage({
            id: msg.id,
            userId: msg.user_id,
            username: msg.username,
            message: msg.message,
            timestamp: msg.created_at,
          });
        });
      } catch (error) {
        console.error('Failed to load chat messages:', error);
      }
    };

    loadMessages();
  }, [roomId, addMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for incoming messages
  useEffect(() => {
    console.log('💬 ChatPanel: Setting up subscription for roomId:', roomId);
    if (!roomId) {
      console.log('⚠️ ChatPanel: No roomId, skipping subscription');
      return;
    }

    const handleNewMessage = (message) => {
      console.log('💬 ChatPanel: Received message via subscription:', message);
      addMessage({
        id: message.id,
        userId: message.user_id,
        username: message.username,
        message: message.message,
        timestamp: message.created_at,
      });
    };

    // Subscribe to chat messages for this room
    console.log('💬 ChatPanel: Calling subscribeToChatMessages...');
    const unsubscribe = realtimeGameService.subscribeToChatMessages(roomId, handleNewMessage);
    console.log('💬 ChatPanel: Subscription set up, unsubscribe function:', typeof unsubscribe);

    return () => {
      console.log('💬 ChatPanel: Cleaning up subscription for room:', roomId);
      if (unsubscribe) unsubscribe();
    };
  }, [roomId, user?.id, addMessage]);

  // Handle typing indicator (simplified for now - can be enhanced later)
  const handleTyping = () => {
    // Clear previous timeout
    if (isTypingTimeout) {
      clearTimeout(isTypingTimeout);
    }

    // Set timeout to stop typing indicator after 2 seconds
    const timeout = setTimeout(() => {
      setTyping(false);
    }, 2000);

    setIsTypingTimeout(timeout);
    setTyping(true);
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!message.trim() || message.length > 200) return;

    try {
      // Send message through realtime service with both roomId and gameId
      await realtimeGameService.sendChatMessage(roomId, gameId, message.trim());

      // Clear input
      setMessage('');

      // Stop typing indicator
      if (isTypingTimeout) {
        clearTimeout(isTypingTimeout);
        setIsTypingTimeout(null);
      }
      setTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => {
          togglePanel();
          if (!isPanelOpen) clearUnread();
        }}
        className="fixed bottom-4 right-4 z-50 bg-primary-500 hover:bg-primary-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Toggle chat"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-20 right-4 z-40 bg-white dark:bg-gray-800 rounded-lg shadow-2xl transition-all duration-300 ${
          isPanelOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          width: '350px',
          maxWidth: '90vw',
          height: '450px',
          maxHeight: '70vh',
        }}
      >
        {/* Header */}
        <div className="bg-primary-500 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Game Chat
          </h3>
          <button
            onClick={togglePanel}
            className="hover:bg-primary-600 rounded p-1 transition-colors"
            aria-label="Close chat"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100% - 120px)' }}>
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Say hello to your opponent!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.userId === user?.id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      isOwnMessage
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold mb-1 opacity-75">
                        {msg.username}
                      </p>
                    )}
                    <p className="text-sm break-words">{msg.message}</p>
                    <p className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span>Typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              maxLength={200}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
            />
            <button
              type="submit"
              disabled={!message.trim() || message.length > 200}
              className="bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-1">
            {message.length}/200
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
