import { create } from 'zustand';
import tournamentService from '../services/tournamentService';

const useTournamentStore = create((set, get) => ({
  // State
  tournaments: [],
  activeTournament: null,
  userTournaments: [],
  currentBracket: null,
  currentMatch: null,
  isLoading: false,
  error: null,
  subscribed: false,
  isUnsubscribing: false,

  // Actions

  /**
   * Initialize tournament service (no socket needed now)
   */
  init: async () => {
    console.log('🏆 Tournament service initialized (using Supabase Realtime)');
  },

  /**
   * Subscribe to tournament real-time events
   */
  subscribeToTournaments: () => {
    if (get().subscribed) {
      console.log('Already subscribed to tournaments');
      return;
    }

    const handlers = {
      onNew: (tournament) => {
        console.log('🏆 New tournament:', tournament);
        set((state) => ({
          tournaments: [tournament, ...state.tournaments],
        }));
      },

      onUpdate: (tournament) => {
        console.log('🏆 Tournament updated:', tournament);
        set((state) => ({
          tournaments: state.tournaments.map(t =>
            t.id === tournament.id ? { ...t, ...tournament } : t
          ),
          activeTournament: state.activeTournament?.id === tournament.id
            ? { ...state.activeTournament, ...tournament }
            : state.activeTournament,
        }));
      },
    };

    tournamentService.subscribeTournamentsList(handlers);
    set({ subscribed: true });
    console.log('🏆 Subscribed to tournament events');
  },

  /**
   * Unsubscribe from tournament events
   */
  unsubscribeFromTournaments: async () => {
    const state = get();
    if (state.isUnsubscribing || !state.subscribed) {
      return; // Already unsubscribing or not subscribed
    }
    
    set({ isUnsubscribing: true });
    
    try {
      await tournamentService.unsubscribeAll();
      set({ subscribed: false, isUnsubscribing: false });
      console.log('🏆 Unsubscribed from tournament events');
    } catch (error) {
      console.error('🏆 Error unsubscribing:', error);
      set({ isUnsubscribing: false });
    }
  },

  /**
   * Fetch all tournaments
   */
  fetchTournaments: async (status = null) => {
    set({ isLoading: true, error: null });
    try {
      const tournaments = await tournamentService.fetchTournaments(status);
      set({ tournaments, isLoading: false });
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  /**
   * Fetch tournament details
   */
  fetchTournamentDetails: async (tournamentId) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🏆 Fetching tournament details for:', tournamentId);
      const tournament = await tournamentService.fetchTournamentById(tournamentId);
      console.log('🏆 Tournament fetched, status:', tournament.status);
      
      // If tournament is active, also fetch bracket
      let bracket = null;
      if (tournament.status === 'active') {
        console.log('🏆 Tournament is active, fetching bracket...');
        bracket = await tournamentService.getTournamentBracket(tournamentId);
        console.log('🏆 Bracket fetched, matches:', bracket?.length || 0);
      }
      
      console.log('🏆 Setting tournament details, bracket:', bracket?.length || 'null');
      set({ 
        activeTournament: {
          ...tournament,
          currentBracket: bracket,
        },
        currentBracket: bracket,
        isLoading: false 
      });
      
      // Subscribe to this specific tournament updates
      tournamentService.subscribeTournament(tournamentId, {
        onUpdate: (updated) => {
          console.log('🏆 Tournament details updated:', updated);
          set((state) => {
            // If tournament just became active, fetch bracket
            if (updated.status === 'active' && state.activeTournament?.status !== 'active') {
              console.log('🏆 Tournament just started! Fetching bracket...');
              tournamentService.getTournamentBracket(tournamentId).then(bracket => {
                set((bracketState) => ({
                  activeTournament: bracketState.activeTournament ? {
                    ...bracketState.activeTournament,
                    currentBracket: bracket,
                  } : null,
                  currentBracket: bracket,
                }));
              });
            }
            
            return {
              activeTournament: state.activeTournament?.id === updated.id
                ? { ...state.activeTournament, ...updated }
                : state.activeTournament,
            };
          });
        },
        onPlayerJoined: (newParticipant) => {
          console.log('🏆 Player joined:', newParticipant);
          // Update participants list
          set((state) => {
            if (!state.activeTournament) return state;
            return {
              activeTournament: {
                ...state.activeTournament,
                participants: [
                  ...(state.activeTournament.participants || []),
                  newParticipant
                ],
                current_players: (state.activeTournament.current_players || 0) + 1,
              },
            };
          });
        },
        onPlayerLeft: (leftParticipant) => {
          console.log('🏆 Player left:', leftParticipant);
          // Remove from participants list
          set((state) => {
            if (!state.activeTournament) return state;
            return {
              activeTournament: {
                ...state.activeTournament,
                participants: (state.activeTournament.participants || []).filter(
                  p => p.id !== leftParticipant.id
                ),
                current_players: Math.max(0, (state.activeTournament.current_players || 0) - 1),
              },
            };
          });
        },
        onBracketUpdate: (payload) => {
          console.log('🏆 Bracket match updated:', payload);
          // Refresh bracket when any match changes
          tournamentService.getTournamentBracket(tournamentId).then(bracket => {
            set((state) => ({
              activeTournament: state.activeTournament ? {
                ...state.activeTournament,
                currentBracket: bracket,
              } : null,
              currentBracket: bracket,
            }));
          }).catch(error => {
            console.error('Error refreshing bracket:', error);
          });
        },
      });
    } catch (error) {
      console.error('Error fetching tournament details:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  /**
   * Fetch user's tournaments
   */
  fetchUserTournaments: async (userId) => {
    try {
      const tournaments = await tournamentService.fetchUserTournaments(userId);
      set({ userTournaments: tournaments });
    } catch (error) {
      console.error('Error fetching user tournaments:', error);
    }
  },

  /**
   * Create a new tournament
   */
  createTournament: async (tournamentData) => {
    set({ isLoading: true, error: null });
    try {
      const tournament = await tournamentService.createTournament(tournamentData);
      set({ isLoading: false });
      return tournament;
    } catch (error) {
      console.error('Error creating tournament:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Join a tournament
   */
  joinTournament: async (tournamentId) => {
    set({ isLoading: true, error: null });
    try {
      await tournamentService.joinTournament(tournamentId);
      set({ isLoading: false });
    } catch (error) {
      console.error('Error joining tournament:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Leave a tournament
   */
  leaveTournament: async (tournamentId) => {
    set({ isLoading: true, error: null });
    try {
      await tournamentService.leaveTournament(tournamentId);
      set({ isLoading: false });
    } catch (error) {
      console.error('Error leaving tournament:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Start a tournament
   */
  startTournament: async (tournamentId) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🏆 [STORE] Starting tournament:', tournamentId);
      await tournamentService.startTournament(tournamentId);
      console.log('🏆 [STORE] Tournament start call completed successfully');
      set({ isLoading: false });
    } catch (error) {
      console.error('🏆 [STORE] ❌ ERROR starting tournament:', error);
      console.error('🏆 [STORE] Error message:', error.message);
      console.error('🏆 [STORE] Full error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Cancel a tournament
   */
  cancelTournament: async (tournamentId) => {
    set({ isLoading: true, error: null });
    try {
      await tournamentService.cancelTournament(tournamentId);
      set({ isLoading: false });
    } catch (error) {
      console.error('Error cancelling tournament:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Get tournament bracket
   */
  fetchTournamentBracket: async (tournamentId) => {
    set({ isLoading: true, error: null });
    try {
      const bracket = await tournamentService.getTournamentBracket(tournamentId);
      set((state) => ({
        currentBracket: bracket,
        activeTournament: state.activeTournament ? {
          ...state.activeTournament,
          currentBracket: bracket,
        } : null,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error fetching tournament bracket:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  /**
   * Check and fix all rounds in a tournament
   */
  checkAndFixAllRounds: async (tournamentId) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🏆 [STORE] Checking and fixing rounds for:', tournamentId);
      
      // First, repair any missing winner advancements
      console.log('🏆 [STORE] Step 1: Repairing bracket (advancing winners)...');
      const repairResult = await tournamentService.repairTournamentBracket(tournamentId);
      console.log('🏆 [STORE] Repair result:', repairResult.message);
      
      // Then check and activate rounds
      console.log('🏆 [STORE] Step 2: Activating ready rounds...');
      const result = await tournamentService.checkAndFixAllRounds(tournamentId);
      console.log('🏆 [STORE] Activation result:', result.message);
      
      // Refresh tournament details to get updated bracket
      await get().fetchTournamentDetails(tournamentId);
      
      const totalFixed = (repairResult.repairedCount || 0) + (result.fixedCount || 0);
      const combinedMessage = totalFixed > 0
        ? `Fixed ${totalFixed} issues: ${repairResult.repairedCount || 0} winner advancements, ${result.fixedCount || 0} status updates`
        : 'All rounds are correctly configured';
      
      set({ isLoading: false });
      return { success: true, message: combinedMessage, fixedCount: totalFixed };
    } catch (error) {
      console.error('🏆 [STORE] Error fixing rounds:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Complete a match and advance winner
   */
  completeMatch: async (matchId, winnerId, gameId = null) => {
    set({ isLoading: true, error: null });
    try {
      await tournamentService.completeMatch(matchId, winnerId, gameId);
      set({ isLoading: false });
    } catch (error) {
      console.error('Error completing match:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Reset state
   */
  reset: () => {
    tournamentService.unsubscribeAll();
    set({
      tournaments: [],
      activeTournament: null,
      userTournaments: [],
      currentBracket: null,
      currentMatch: null,
      isLoading: false,
      error: null,
      subscribed: false,
    });
  },
}));

export default useTournamentStore;
