import { useEffect } from 'react';
import useAuthStore from '../stores/authStore';

/**
 * Custom hook for authentication
 * Provides easy access to auth state and actions
 */
export const useAuth = () => {
  const {
    user,
    profile,
    session,
    isLoading,
    error,
    initialize,
    signUp,
    signIn,
    signOut,
    updateProfile,
    clearError,
  } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    // Only initialize if we haven't loaded a session yet
    if (!user && !isLoading) {
      initialize();
    }
  }, []); // Empty deps - only run once on mount

  return {
    // State
    user,
    profile,
    session,
    isLoading,
    error,
    isAuthenticated: !!user,

    // Actions
    signUp,
    signIn,
    signOut,
    updateProfile,
    clearError,

    // Computed values
    username: profile?.username || 'Guest',
    userStats: profile ? {
      wins: profile.wins,
      losses: profile.losses,
      gamesPlayed: profile.games_played,
      winRate: profile.games_played > 0
        ? ((profile.wins / profile.games_played) * 100).toFixed(1)
        : 0,
    } : null,
  };
};

export default useAuth;
