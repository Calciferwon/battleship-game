import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, getUserProfile } from '../services/supabase';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      profile: null,
      session: null,
      isLoading: false, // Changed from true to false - should only be true during active operations
      error: null,

      // Actions
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Initialize auth state
      initialize: async () => {
        try {
          set({ isLoading: true, error: null });

          // Get current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) throw sessionError;

          if (session) {
            set({ session, user: session.user });

            // Fetch user profile
            try {
              const profile = await getUserProfile(session.user.id);
              set({ profile, isLoading: false });
            } catch (profileError) {
              console.error('Error fetching profile:', profileError);
              // Profile might not exist yet (race condition), that's okay
              set({ isLoading: false });
            }
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          set({ error: error.message, isLoading: false });
        }
      },

      // Sign up with email and password
      signUp: async (email, password, username) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username,
              },
            },
          });

          if (error) throw error;

          if (data.user) {
            set({
              user: data.user,
              session: data.session,
            });

            // Wait a moment for the trigger to create the profile
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Fetch the newly created profile
            try {
              const profile = await getUserProfile(data.user.id);
              set({ profile });
            } catch (profileError) {
              console.error('Profile not created yet:', profileError);
            }
          }

          set({ isLoading: false });
          return { data, error: null };
        } catch (error) {
          console.error('Error signing up:', error);
          set({ error: error.message, isLoading: false });
          return { data: null, error };
        }
      },

      // Sign in with email and password
      signIn: async (email, password) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            set({
              user: data.user,
              session: data.session,
            });

            // Fetch user profile
            const profile = await getUserProfile(data.user.id);
            set({ profile });
          }

          set({ isLoading: false });
          return { data, error: null };
        } catch (error) {
          console.error('Error signing in:', error);
          set({ error: error.message, isLoading: false });
          return { data: null, error };
        }
      },

      // Sign out
      signOut: async () => {
        try {
          console.log('🚪 Sign out initiated');
          set({ isLoading: true, error: null });

          const { error } = await supabase.auth.signOut();

          if (error) {
            console.error('❌ Sign out error:', error);
            throw error;
          }

          console.log('✅ Sign out successful');
          set({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
          });

          // Force reload to clear all state
          window.location.href = '/';

          return { error: null };
        } catch (error) {
          console.error('❌ Error signing out:', error);
          set({ error: error.message, isLoading: false });
          return { error };
        }
      },

      // Update profile
      updateProfile: async (updates) => {
        try {
          const { user } = get();
          if (!user) throw new Error('No user logged in');

          const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

          if (error) throw error;

          set({ profile: data });
          return { data, error: null };
        } catch (error) {
          console.error('Error updating profile:', error);
          return { data: null, error };
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'battleship-auth-storage',
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        profile: state.profile,
        // Don't persist isLoading - it should always start as false
      }),
      onRehydrateStorage: () => (state) => {
        // Ensure isLoading is false after rehydration
        if (state) {
          state.isLoading = false;
        }
      },
    }
  )
);

// Set up auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  const store = useAuthStore.getState();

  if (event === 'SIGNED_IN') {
    store.setSession(session);
    store.setUser(session?.user || null);

    if (session?.user) {
      try {
        const profile = await getUserProfile(session.user.id);
        store.setProfile(profile);
      } catch (error) {
        console.error('Error fetching profile on auth change:', error);
      }
    }
  } else if (event === 'SIGNED_OUT') {
    store.setUser(null);
    store.setProfile(null);
    store.setSession(null);
  } else if (event === 'TOKEN_REFRESHED') {
    store.setSession(session);
  }
});

export default useAuthStore;
