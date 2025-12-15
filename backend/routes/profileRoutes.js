import express from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/profile/:userId
 * Get user profile by ID (public)
 */
router.get('/:userId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Profile not found',
        });
      }
      throw error;
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch profile',
    });
  }
});

/**
 * GET /api/profile/:userId/stats
 * Get detailed statistics for a user
 */
router.get('/:userId/stats', optionalAuthMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch profile with basic stats
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Profile not found',
        });
      }
      throw profileError;
    }

    // Fetch recent games
    const { data: recentGames, error: gamesError } = await supabase
      .from('games')
      .select(`
        id,
        status,
        winner_id,
        win_reason,
        created_at,
        started_at,
        ended_at,
        player1_id,
        player2_id
      `)
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq('status', 'completed')
      .order('ended_at', { ascending: false })
      .limit(10);

    if (gamesError) throw gamesError;

    // Calculate win streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (const game of recentGames || []) {
      if (game.winner_id === userId) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    // Current streak is from most recent games
    for (const game of recentGames || []) {
      if (game.winner_id === userId) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate average game duration
    let totalDuration = 0;
    let gamesWithDuration = 0;

    for (const game of recentGames || []) {
      if (game.started_at && game.ended_at) {
        const start = new Date(game.started_at);
        const end = new Date(game.ended_at);
        totalDuration += (end - start) / 60000; // Convert to minutes
        gamesWithDuration++;
      }
    }

    const avgGameDuration = gamesWithDuration > 0
      ? Math.round(totalDuration / gamesWithDuration)
      : 0;

    res.json({
      profile,
      stats: {
        wins: profile.wins,
        losses: profile.losses,
        gamesPlayed: profile.games_played,
        winRate: profile.games_played > 0
          ? ((profile.wins / profile.games_played) * 100).toFixed(1)
          : 0,
        currentStreak,
        longestStreak,
        avgGameDuration,
      },
      recentGames: recentGames || [],
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user statistics',
    });
  }
});

/**
 * PUT /api/profile
 * Update current user's profile (authenticated)
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, avatar_url } = req.body;

    // Build update object
    const updates = {};

    if (username !== undefined) {
      // Validate username
      if (!username || username.length < 3 || username.length > 20) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Username must be between 3 and 20 characters',
        });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Username can only contain letters, numbers, and underscores',
        });
      }

      updates.username = username;
    }

    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No updates provided',
      });
    }

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Username already taken',
        });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile',
    });
  }
});

/**
 * GET /api/profile/search
 * Search for users by username
 */
router.get('/search', optionalAuthMiddleware, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Search query must be at least 2 characters',
      });
    }

    // Search profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, wins, losses, games_played')
      .ilike('username', `%${q}%`)
      .limit(10);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error searching profiles:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search profiles',
    });
  }
});

/**
 * GET /api/profile/leaderboard
 * Get top players by wins
 */
router.get('/leaderboard', optionalAuthMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, wins, losses, games_played')
      .order('wins', { ascending: false })
      .order('games_played', { ascending: true }) // Tiebreaker: fewer games played
      .limit(parseInt(limit));

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch leaderboard',
    });
  }
});

export default router;
