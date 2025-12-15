import { supabase } from './supabase';

/**
 * Tournament Service
 * Frontend service for tournament operations using Supabase
 */
class TournamentService {
  constructor() {
    this.channels = new Map();
  }

  /**
   * Get auth headers for API requests
   */
  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.access_token) {
      throw new Error('No authentication token available. Please log in again.');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  }

  // ============ REST API Methods (Supabase Direct) ============

  /**
   * Fetch all tournaments
   * @param {String} status - Optional filter by status
   * @returns {Promise<Array>}
   */
  async fetchTournaments(status = null) {
    let query = supabase
      .from('tournaments')
      .select(`
        *,
        created_by_profile:profiles!tournaments_created_by_fkey(id, username, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(tournament => ({
      ...tournament,
      creator: tournament.created_by_profile,
    }));
  }

  /**
   * Fetch tournament by ID
   * @param {String} tournamentId
   * @returns {Promise<Object>}
   */
  async fetchTournamentById(tournamentId) {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        created_by_profile:profiles!tournaments_created_by_fkey(id, username, avatar_url),
        participants:tournament_participants(
          id,
          user_id,
          seed,
          current_round,
          eliminated,
          placement,
          joined_at,
          profile:profiles(id, username, avatar_url)
        )
      `)
      .eq('id', tournamentId)
      .single();

    if (error) throw error;

    return {
      ...data,
      creator: data.created_by_profile,
      participants: data.participants.map(p => ({
        ...p,
        user: p.profile,
      })),
    };
  }

  /**
   * Fetch user's tournaments
   * @param {String} userId
   * @returns {Promise<Array>}
   */
  async fetchUserTournaments(userId) {
    const { data, error } = await supabase
      .rpc('get_user_tournaments', {
        user_id_param: userId,
      });

    if (error) throw error;
    return data;
  }

  // ============ Database Mutation Methods ============

  /**
   * Create a new tournament
   * @param {Object} tournamentData
   * @returns {Promise<Object>}
   */
  async createTournament(tournamentData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { name, description, maxPlayers = 8, registrationEndsAt } = tournamentData;

    // Validate max players (allow any number from 2 to 128)
    if (!maxPlayers || maxPlayers < 2 || maxPlayers > 128) {
      throw new Error('Max players must be between 2 and 128');
    }

    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name,
        description,
        max_players: maxPlayers,
        created_by: user.id,
        registration_ends_at: registrationEndsAt || null,
        status: 'registration',
        current_players: 0,
      })
      .select(`
        *,
        created_by_profile:profiles!tournaments_created_by_fkey(id, username, avatar_url)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      creator: data.created_by_profile,
    };
  }

  /**
   * Join a tournament
   * @param {String} tournamentId
   * @returns {Promise<Object>}
   */
  async joinTournament(tournamentId) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if tournament exists and is accepting registrations
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, status, current_players, max_players')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) throw tournamentError;

    if (tournament.status !== 'registration') {
      throw new Error('Tournament is not accepting registrations');
    }

    if (tournament.current_players >= tournament.max_players) {
      throw new Error('Tournament is full');
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      throw new Error('Already joined this tournament');
    }

    // Join tournament
    const { data, error } = await supabase
      .from('tournament_participants')
      .insert({
        tournament_id: tournamentId,
        user_id: user.id,
      })
      .select(`
        *,
        profile:profiles(id, username, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Update tournament player count
    await supabase
      .from('tournaments')
      .update({
        current_players: tournament.current_players + 1
      })
      .eq('id', tournamentId);

    return {
      ...data,
      user: data.profile,
    };
  }

  /**
   * Leave a tournament
   * @param {String} tournamentId
   * @returns {Promise}
   */
  async leaveTournament(tournamentId) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check tournament status
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('status, current_players')
      .eq('id', tournamentId)
      .single();

    if (tournament?.status !== 'registration') {
      throw new Error('Cannot leave tournament after it has started');
    }

    // Remove participant
    const { error } = await supabase
      .from('tournament_participants')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id);

    if (error) throw error;

    // Update tournament player count
    await supabase
      .from('tournaments')
      .update({
        current_players: Math.max(0, tournament.current_players - 1)
      })
      .eq('id', tournamentId);

    return { success: true };
  }

  /**
   * Start a tournament (creator only)
   * @param {String} tournamentId
   * @returns {Promise}
   */
  async startTournament(tournamentId) {
    console.log('🏆 startTournament called for:', tournamentId);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Verify user is creator
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('created_by, status, current_players, max_players')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) throw tournamentError;

    if (tournament.created_by !== user.id) {
      throw new Error('Only tournament creator can start the tournament');
    }

    // If already active, generate bracket if it doesn't exist
    if (tournament.status === 'active') {
      console.log('🏆 Tournament already active, checking for existing bracket...');
      // Check if bracket already exists
      const { data: existingMatches } = await supabase
        .from('tournament_matches')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1);
      
      if (existingMatches && existingMatches.length > 0) {
        console.log('🏆 Bracket already exists, skipping generation');
        const { data } = await supabase
          .from('tournaments')
          .select()
          .eq('id', tournamentId)
          .single();
        return data;
      }
      
      console.log('🏆 Tournament is active but has no bracket, generating...');
      // Fall through to generate bracket
    } else if (tournament.status !== 'registration') {
      throw new Error('Tournament has already started');
    }

    // Allow starting with any number >= 2, regardless of max_players
    if (tournament.current_players < 2) {
      throw new Error('Need at least 2 players to start tournament');
    }

    // Update tournament status if not already active
    if (tournament.status !== 'active') {
      const { data: updateData, error: updateError } = await supabase
        .from('tournaments')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', tournamentId)
        .select()
        .single();

      if (updateError) throw updateError;
      tournament.status = 'active';
    }

    // Generate initial bracket with random pairings
    console.log('🏆 About to generate bracket...');
    try {
      await this.generateInitialBracket(tournamentId);
      console.log('🏆 Bracket generation completed!');
    } catch (bracketError) {
      console.error('🏆 ERROR in bracket generation:', bracketError);
      throw bracketError;
    }

    const { data } = await supabase
      .from('tournaments')
      .select()
      .eq('id', tournamentId)
      .single();

    return data;
  }

  /**
   * Generate initial tournament bracket with random pairings
   * @param {String} tournamentId
   */
  async generateInitialBracket(tournamentId) {
    console.log('🏆 Starting bracket generation for tournament:', tournamentId);
    
    // Fetch all participants
    const { data: participants, error: participantsError } = await supabase
      .from('tournament_participants')
      .select('user_id, profile:profiles(id, username, avatar_url)')
      .eq('tournament_id', tournamentId)
      .order('joined_at', { ascending: true });

    if (participantsError) {
      console.error('🏆 ERROR fetching participants:', participantsError);
      console.error('🏆 Error details:', {
        message: participantsError.message,
        code: participantsError.code,
        details: participantsError.details,
        hint: participantsError.hint
      });
      throw participantsError;
    }

    console.log('🏆 Fetched participants:', participants?.length || 0);

    const playerCount = participants.length;
    if (playerCount < 2) {
      throw new Error('Need at least 2 players to start tournament');
    }

    // Calculate next power of 2
    const roundsNeeded = Math.ceil(Math.log2(playerCount));
    const nextPowerOf2 = Math.pow(2, roundsNeeded);
    const byesCount = nextPowerOf2 - playerCount;

    console.log(`🏆 Generating bracket: ${playerCount} players, ${roundsNeeded} rounds, ${byesCount} byes`);

    // Randomize player order (shuffle)
    const shuffledPlayers = this.shuffleArray(participants);

    // Create matches for Round 1
    const matches = [];
    let matchNumber = 1;

    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      const player1 = shuffledPlayers[i];
      const player2 = shuffledPlayers[i + 1];

      // If odd number of players, some get byes
      if (player2) {
        // Regular match
        matches.push({
          tournament_id: tournamentId,
          round: 1,
          match_number: matchNumber,
          bracket_position: `R1-M${matchNumber}`,
          player1_id: player1.user_id,
          player2_id: player2.user_id,
          status: 'ready',
        });
      } else {
        // Bye match (player1 advances automatically)
        matches.push({
          tournament_id: tournamentId,
          round: 1,
          match_number: matchNumber,
          bracket_position: `R1-M${matchNumber}`,
          player1_id: player1.user_id,
          player2_id: null,
          status: 'ready', // Ready means waiting for opponent from another match
          winner_id: player1.user_id, // Bye winner
        });
      }

      matchNumber++;
    }

    // Insert all first round matches
    if (matches.length > 0) {
      console.log('🏆 About to insert matches:', matches.length, 'matches');
      console.log('🏆 Match sample:', JSON.stringify(matches[0], null, 2));
      
      const { error: insertError } = await supabase
        .from('tournament_matches')
        .insert(matches);

      if (insertError) {
        console.error('🏆 ERROR inserting first round matches:', insertError);
        console.error('🏆 Error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
        console.error('🏆 Attempted to insert:', matches.length, 'matches');
        throw insertError;
      }

      console.log(`🏆 ✅ Successfully created ${matches.length} first round matches`);
    }

    // Generate subsequent rounds
    await this.generateSubsequentRounds(tournamentId, roundsNeeded);
    console.log('🏆 Bracket generation completed successfully!');
  }

  /**
   * Generate subsequent rounds (Quarter-finals, Semi-finals, Finals)
   * @param {String} tournamentId
   * @param {Number} totalRounds
   */
  async generateSubsequentRounds(tournamentId, totalRounds) {
    if (totalRounds < 2) {
      console.log('🏆 Only 1 round needed, skipping subsequent rounds');
      return;
    }

    console.log(`🏆 Generating ${totalRounds - 1} subsequent rounds for tournament:`, tournamentId);

    // Create structure for all subsequent rounds
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      const matches = [];

      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        const roundName = this.getRoundName(round, totalRounds);
        matches.push({
          tournament_id: tournamentId,
          round: round,
          match_number: matchNum,
          bracket_position: `${roundName}-M${matchNum}`,
          status: 'pending',
        });
      }

      if (matches.length > 0) {
        console.log(`🏆 Inserting ${matches.length} matches for round ${round}...`);
        
        const { error: insertError } = await supabase
          .from('tournament_matches')
          .insert(matches);

        if (insertError) {
          console.error(`🏆 ERROR inserting round ${round} matches:`, insertError);
          console.error('🏆 Error details:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint
          });
          throw insertError;
        }

        console.log(`🏆 ✅ Created ${matches.length} matches for round ${round}`);
      }
    }
    console.log('🏆 ✅ All subsequent rounds created successfully');
  }

  /**
   * Get round name from round number
   * @param {Number} round
   * @param {Number} totalRounds
   * @returns {String}
   */
  getRoundName(round, totalRounds) {
    const roundsFromEnd = totalRounds - round;
    if (roundsFromEnd === 0) return 'FINAL';
    if (roundsFromEnd === 1) return 'SF'; // Semi-Finals
    if (roundsFromEnd === 2) return 'QF'; // Quarter-Finals
    return `R${round}`;
  }

  /**
   * Fisher-Yates shuffle algorithm
   * @param {Array} array
   * @returns {Array}
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Cancel a tournament (creator only)
   * @param {String} tournamentId
   * @returns {Promise}
   */
  async cancelTournament(tournamentId) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Verify user is creator
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('created_by, status')
      .eq('id', tournamentId)
      .single();

    if (tournament?.created_by !== user.id) {
      throw new Error('Only tournament creator can cancel the tournament');
    }

    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      throw new Error('Cannot cancel a completed or already cancelled tournament');
    }

    const { data, error } = await supabase
      .from('tournaments')
      .update({
        status: 'cancelled',
      })
      .eq('id', tournamentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get tournament bracket/matches
   * @param {String} tournamentId
   * @returns {Promise<Array>}
   */
  async getTournamentBracket(tournamentId) {
    console.log('🏆 Fetching bracket for tournament:', tournamentId);
    const { data, error } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        player1:profiles!tournament_matches_player1_id_fkey(id, username, avatar_url),
        player2:profiles!tournament_matches_player2_id_fkey(id, username, avatar_url),
        winner:profiles!tournament_matches_winner_id_fkey(id, username, avatar_url)
      `)
      .eq('tournament_id', tournamentId)
      .order('round')
      .order('match_number');

    if (error) {
      console.error('🏆 Error fetching bracket:', error);
      throw error;
    }
    
    console.log('🏆 Bracket fetched successfully, matches:', data?.length || 0);
    return data;
  }

  /**
   * Complete a match and advance winner to next round
   * @param {String} matchId
   * @param {String} winnerId
   * @param {String} gameId - Optional game ID
   */
  async completeMatch(matchId, winnerId, gameId = null) {
    console.log('🏆 completeMatch called:', { matchId, winnerId, gameId });
    
    try {
      // Validate winnerId
      if (!winnerId) {
        console.error('🏆 ❌ ERROR: winnerId is required but was null/undefined');
        throw new Error('Winner ID is required to complete a match');
      }
      
      console.log('🏆 Step 1: Fetching match details...');
      
      // Helper function to execute query with timeout
      const queryWithTimeout = async (queryFn, timeoutMs = 10000) => {
        return Promise.race([
          queryFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Database query timed out after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      };
      
      // Get the match details with retry logic and individual query timeout
      let match = null;
      let matchError = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts && !match) {
        attempts++;
        console.log(`🏆 Query attempt ${attempts}/${maxAttempts}...`);
        
        try {
          // Simple query with minimal fields and 10-second timeout
          const queryFn = async () => {
            const { data, error } = await supabase
              .from('tournament_matches')
              .select('id, tournament_id, round, match_number, bracket_position, status, winner_id, player1_id, player2_id')
              .eq('id', matchId)
              .maybeSingle();
            return { data, error };
          };
          
          const { data, error } = await queryWithTimeout(queryFn, 10000);
          
          matchError = error;
          match = data;
          
          if (matchError) {
            console.error(`🏆 ⚠️ Attempt ${attempts} error:`, matchError.message);
            if (attempts < maxAttempts) {
              console.log(`🏆 Retrying in ${attempts * 1000}ms...`);
              await new Promise(resolve => setTimeout(resolve, attempts * 1000));
            }
          } else if (match) {
            console.log(`🏆 ✅ Match fetched successfully on attempt ${attempts}`);
            break;
          } else {
            console.error(`🏆 ⚠️ Match not found on attempt ${attempts}`);
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, attempts * 1000));
            }
          }
        } catch (err) {
          console.error(`🏆 ❌ Attempt ${attempts} exception:`, err.message);
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to fetch match after ${maxAttempts} attempts: ${err.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, attempts * 1000));
        }
      }

      if (matchError) {
        console.error('🏆 ❌ Error fetching match:', matchError);
        throw matchError;
      }

      if (!match) {
        console.error('🏆 ❌ Match not found');
        throw new Error('Match not found');
      }

      console.log('🏆 ✅ Step 1 complete: Match details:', { 
        round: match.round, 
        matchNumber: match.match_number, 
        position: match.bracket_position,
        currentStatus: match.status,
        currentWinner: match.winner_id,
        tournamentId: match.tournament_id
      });

      // Check if match is already completed
      if (match.status === 'completed' && match.winner_id) {
        console.log('🏆 ⚠️ Match already completed with winner:', match.winner_id);
        
        // Verify the winner is correct
        if (match.winner_id === winnerId) {
          console.log('🏆 ✅ Winner matches, skipping duplicate update');
          return { success: true, alreadyCompleted: true };
        } else {
          console.error('🏆 ❌ ERROR: Match already completed with different winner!', {
            existing: match.winner_id,
            attempted: winnerId
          });
          throw new Error('Match already completed with a different winner');
        }
      }

      console.log('🏆 Step 2: Updating match status to completed...');
      // Update match status with timeout
      const updateQueryFn = async () => {
        return await supabase
          .from('tournament_matches')
          .update({
            status: 'completed',
            winner_id: winnerId,
            game_id: gameId,
            completed_at: new Date().toISOString(),
          })
          .eq('id', matchId);
      };
      
      const { error: updateError } = await queryWithTimeout(updateQueryFn, 10000);

      if (updateError) {
        console.error('🏆 ❌ Error updating match status:', updateError);
        throw updateError;
      }

      console.log('🏆 ✅ Step 2 complete: Match status updated to completed with winner:', winnerId);

      // Check if this is the finals match by bracket position
      const isFinals = match.bracket_position && match.bracket_position.startsWith('FINAL');
      console.log('🏆 Step 3: Checking if finals match...', { bracket_position: match.bracket_position, isFinals });
      
      if (isFinals) {
        console.log('🏆 🎉 This was the FINALS - Tournament complete!');
        
        // Mark tournament as completed
        console.log('🏆 Step 4: Marking tournament as completed...');
        const tournamentQueryFn = async () => {
          return await supabase
            .from('tournaments')
            .update({
              status: 'completed',
              winner_id: winnerId,
              completed_at: new Date().toISOString(),
            })
            .eq('id', match.tournament_id);
        };
        
        const { error: tournamentUpdateError } = await queryWithTimeout(tournamentQueryFn, 10000);

        if (tournamentUpdateError) {
          console.error('🏆 ❌ Error updating tournament status:', tournamentUpdateError);
          // Don't throw - match is already completed
        } else {
          console.log('🏆 ✅ Step 4 complete: Tournament marked as completed with winner:', winnerId);
        }
      } else {
        console.log('🏆 Step 4: Not finals, advancing winner to next round...');
        await this.advanceWinnerToNextRound(match.tournament_id, match.round, match.match_number, winnerId);
        console.log('🏆 ✅ Step 4 complete: Winner advanced successfully');
      }

      console.log('🏆 ✅ completeMatch finished successfully');
      return { success: true };
    } catch (error) {
      console.error('🏆 ❌ completeMatch failed with error:', error);
      console.error('🏆 ❌ Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Advance a match winner to their next round match
   * @param {String} tournamentId
   * @param {Number} currentRound
   * @param {Number} currentMatchNumber
   * @param {String} winnerId
   */
  async advanceWinnerToNextRound(tournamentId, currentRound, currentMatchNumber, winnerId) {
    console.log('🏆 advanceWinnerToNextRound:', { 
      tournamentId, 
      currentRound, 
      currentMatchNumber, 
      winnerId 
    });
    
    // Calculate next match position
    // In a bracket, positions determine which slot (player1 or player2) they take in the next round
    // Match 1 vs 2 → next round match 1, Match 3 vs 4 → next round match 2, etc.
    const nextMatchNumber = Math.ceil(currentMatchNumber / 2);
    const isPlayer1Slot = currentMatchNumber % 2 === 1;

    console.log('🏆 Next round position:', { nextMatchNumber, isPlayer1Slot });

    // Find the next round match
    const { data: nextMatch, error: fetchError } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round', currentRound + 1)
      .eq('match_number', nextMatchNumber)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is OK for the finals
      console.error('🏆 Error fetching next match:', fetchError);
      throw fetchError;
    }

    if (!nextMatch) {
      console.log('🏆 This was the finals match or no next round exists');
      
      // Check if all matches in current round are completed
      await this.checkAndProgressRound(tournamentId, currentRound);
      return;
    }

    console.log('🏆 Found next match:', {
      id: nextMatch.id,
      position: nextMatch.bracket_position,
      currentPlayer1: nextMatch.player1_id,
      currentPlayer2: nextMatch.player2_id
    });

    // Update the next round match with the winner
    const updateData = isPlayer1Slot
      ? { player1_id: winnerId }
      : { player2_id: winnerId };

    console.log('🏆 Updating next match with:', updateData);

    const { error: updateError } = await supabase
      .from('tournament_matches')
      .update(updateData)
      .eq('id', nextMatch.id);

    if (updateError) {
      console.error('🏆 Error updating next match:', updateError);
      throw updateError;
    }

    console.log('🏆 ✅ Winner assigned to next match');

    // If both slots are now filled, mark as 'ready'
    const { data: updatedMatch } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('id', nextMatch.id)
      .single();

    if (updatedMatch && updatedMatch.player1_id && updatedMatch.player2_id) {
      console.log('🏆 Both players now assigned, marking match as ready');
      
      const { error: readyError } = await supabase
        .from('tournament_matches')
        .update({ status: 'ready' })
        .eq('id', nextMatch.id);

      if (readyError) {
        console.error('🏆 Error marking match as ready:', readyError);
        throw readyError;
      }
      
      console.log(`🏆 ✅ Match ${nextMatchNumber} in round ${currentRound + 1} is ready to start`);
    } else {
      console.log('🏆 Match still waiting for other player:', {
        player1: updatedMatch?.player1_id ? 'assigned' : 'waiting',
        player2: updatedMatch?.player2_id ? 'assigned' : 'waiting'
      });
    }

    // Check if all matches in current round are completed
    await this.checkAndProgressRound(tournamentId, currentRound);
  }

  /**
   * Check if all matches in a round are completed and progress to next round if ready
   * @param {String} tournamentId
   * @param {Number} currentRound
   */
  async checkAndProgressRound(tournamentId, currentRound) {
    try {
      // Get all matches in the current round
      const { data: currentRoundMatches, error: currentError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round', currentRound);

      if (currentError) throw currentError;

      // Check if all matches are completed
      const allCompleted = currentRoundMatches.every(match => match.status === 'completed');

      if (!allCompleted) {
        console.log(`🏆 Round ${currentRound} not yet complete. Completed: ${currentRoundMatches.filter(m => m.status === 'completed').length}/${currentRoundMatches.length}`);
        return;
      }

      console.log(`🏆 🎉 Round ${currentRound} COMPLETE! All ${currentRoundMatches.length} matches finished.`);

      // Check if there's a next round
      const { data: nextRoundMatches, error: nextError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round', currentRound + 1);

      if (nextError) throw nextError;

      if (!nextRoundMatches || nextRoundMatches.length === 0) {
        console.log('🏆 🏁 This was the final round! Tournament complete!');
        
        // Mark tournament as completed
        const { error: tournamentError } = await supabase
          .from('tournaments')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', tournamentId);

        if (tournamentError) throw tournamentError;
        
        console.log('🏆 ✅ Tournament marked as completed');
        return;
      }

      // Check if all next round matches are ready (have both players)
      const allNextRoundReady = nextRoundMatches.every(match => 
        match.player1_id && match.player2_id && match.status === 'ready'
      );

      if (allNextRoundReady) {
        console.log(`🏆 ✅ Round ${currentRound + 1} is READY! All ${nextRoundMatches.length} matches have players assigned.`);
        console.log(`🏆 🚀 Players can now start their Round ${currentRound + 1} matches!`);
      } else {
        const readyCount = nextRoundMatches.filter(m => m.player1_id && m.player2_id).length;
        console.log(`🏆 ⏳ Round ${currentRound + 1} preparing... ${readyCount}/${nextRoundMatches.length} matches have both players`);
      }
    } catch (error) {
      console.error('🏆 Error checking round progress:', error);
    }
  }

  /**
   * Repair a tournament by manually advancing winners from completed matches
   * This fixes tournaments where matches completed but winners weren't advanced
   * @param {String} tournamentId
   */
  async repairTournamentBracket(tournamentId) {
    try {
      console.log(`🏆 🔧 REPAIRING tournament bracket for ${tournamentId}`);

      // Get all matches
      const { data: allMatches, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;

      let repairedCount = 0;

      // Group by round
      const rounds = {};
      allMatches.forEach(match => {
        if (!rounds[match.round]) {
          rounds[match.round] = [];
        }
        rounds[match.round].push(match);
      });

      const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

      // For each round that's complete, advance winners to next round
      for (const roundNum of roundNumbers) {
        const roundMatches = rounds[roundNum];
        const completedMatches = roundMatches.filter(m => m.status === 'completed' && m.winner_id);

        if (completedMatches.length === 0) continue;

        console.log(`🏆 🔧 Round ${roundNum}: Found ${completedMatches.length} completed matches with winners`);

        // Advance each winner
        for (const match of completedMatches) {
          console.log(`🏆 🔧 Advancing winner from R${roundNum}-M${match.match_number}: ${match.winner_id}`);
          
          // Calculate next round position
          const nextMatchNumber = Math.ceil(match.match_number / 2);
          const isPlayer1Slot = match.match_number % 2 === 1;

          // Find next round match
          const nextRound = rounds[roundNum + 1];
          if (!nextRound) {
            console.log(`🏆 🔧 No next round (this was finals)`);
            continue;
          }

          const nextMatch = nextRound.find(m => m.match_number === nextMatchNumber);
          if (!nextMatch) {
            console.log(`🏆 🔧 ⚠️ Could not find next match R${roundNum + 1}-M${nextMatchNumber}`);
            continue;
          }

          // Check if winner already assigned
          const slotField = isPlayer1Slot ? 'player1_id' : 'player2_id';
          if (nextMatch[slotField]) {
            console.log(`🏆 🔧 ✓ Winner already in ${slotField} of R${roundNum + 1}-M${nextMatchNumber}`);
            continue;
          }

          // Advance the winner
          const updateData = isPlayer1Slot
            ? { player1_id: match.winner_id }
            : { player2_id: match.winner_id };

          const { error: updateError } = await supabase
            .from('tournament_matches')
            .update(updateData)
            .eq('id', nextMatch.id);

          if (updateError) {
            console.error(`🏆 🔧 ❌ Failed to advance winner:`, updateError);
            continue;
          }

          repairedCount++;
          console.log(`🏆 🔧 ✅ Advanced winner to R${roundNum + 1}-M${nextMatchNumber} ${slotField}`);

          // Check if both slots now filled and mark ready
          const { data: updatedMatch } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('id', nextMatch.id)
            .single();

          if (updatedMatch && updatedMatch.player1_id && updatedMatch.player2_id) {
            await supabase
              .from('tournament_matches')
              .update({ status: 'ready' })
              .eq('id', nextMatch.id);
            console.log(`🏆 🔧 ✅ Match R${roundNum + 1}-M${nextMatchNumber} now READY!`);
          }
        }
      }

      const message = repairedCount > 0
        ? `Repaired ${repairedCount} winner advancements`
        : 'No repairs needed';

      console.log(`🏆 🔧 ✅ ${message}`);
      return { success: true, message, repairedCount };
    } catch (error) {
      console.error('🏆 🔧 ❌ Error repairing bracket:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Manually check and fix all rounds for a tournament
   * This will scan all rounds and activate any that should be ready
   * Useful for fixing tournaments that got stuck
   * @param {String} tournamentId
   */
  async checkAndFixAllRounds(tournamentId) {
    try {
      console.log(`🏆 🔧 Checking and fixing all rounds for tournament ${tournamentId}`);

      // Get all matches grouped by round
      const { data: allMatches, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;

      if (!allMatches || allMatches.length === 0) {
        console.log('🏆 ❌ No matches found for this tournament');
        return { success: false, message: 'No matches found' };
      }

      // Group matches by round
      const rounds = {};
      allMatches.forEach(match => {
        if (!rounds[match.round]) {
          rounds[match.round] = [];
        }
        rounds[match.round].push(match);
      });

      let fixedCount = 0;
      const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

      for (const roundNum of roundNumbers) {
        const roundMatches = rounds[roundNum];
        const allCompleted = roundMatches.every(m => m.status === 'completed');
        const allReady = roundMatches.every(m => m.status === 'ready' || m.status === 'in_progress' || m.status === 'completed');

        console.log(`🏆 Round ${roundNum}: ${roundMatches.length} matches, completed: ${roundMatches.filter(m => m.status === 'completed').length}`);
        
        // Debug: Show detailed match info for non-completed rounds
        if (!allCompleted) {
          roundMatches.forEach(m => {
            console.log(`  🏆 Match ${m.match_number}: status=${m.status}, player1=${m.player1_id ? '✓' : '✗'}, player2=${m.player2_id ? '✓' : '✗'}`);
          });
        }

        if (allCompleted && roundNum < roundNumbers[roundNumbers.length - 1]) {
          // This round is done, check if next round needs activation
          const nextRound = rounds[roundNum + 1];
          if (nextRound) {
            console.log(`🏆 🔍 Checking Round ${roundNum + 1} for activation needs...`);
            
            // Show what's in the next round
            nextRound.forEach(m => {
              console.log(`  🏆 Match ${m.match_number}: status=${m.status}, player1=${m.player1_id ? '✓' : '✗'}, player2=${m.player2_id ? '✓' : '✗'}`);
            });
            
            const needsActivation = nextRound.filter(m => 
              m.player1_id && m.player2_id && m.status === 'pending'
            );

            if (needsActivation.length > 0) {
              console.log(`🏆 🔧 Activating ${needsActivation.length} matches in round ${roundNum + 1}`);
              
              // Update all pending matches that have both players to 'ready'
              const { error: updateError } = await supabase
                .from('tournament_matches')
                .update({ status: 'ready' })
                .in('id', needsActivation.map(m => m.id));

              if (updateError) throw updateError;
              
              fixedCount += needsActivation.length;
              console.log(`🏆 ✅ Activated ${needsActivation.length} matches in round ${roundNum + 1}`);
            } else {
              const withPlayers = nextRound.filter(m => m.player1_id && m.player2_id);
              const missingPlayers = nextRound.filter(m => !m.player1_id || !m.player2_id);
              
              if (missingPlayers.length > 0) {
                console.log(`🏆 ⚠️ Round ${roundNum + 1} has ${missingPlayers.length} matches missing player assignments!`);
                console.log(`🏆 ⚠️ This means winners were not properly advanced from Round ${roundNum}`);
              } else if (withPlayers.length > 0) {
                console.log(`🏆 ℹ️ Round ${roundNum + 1} has ${withPlayers.length} matches already ready (status not pending)`);
              }
            }
          }
        }
      }

      const message = fixedCount > 0 
        ? `Fixed ${fixedCount} matches across tournament` 
        : 'All rounds are correctly configured';

      console.log(`🏆 ✅ ${message}`);
      return { success: true, message, fixedCount };
    } catch (error) {
      console.error('🏆 ❌ Error fixing rounds:', error);
      return { success: false, message: error.message };
    }
  }

  // ============ Realtime Subscription Methods ============

  /**
   * Subscribe to tournament changes
   * @param {String} tournamentId
   * @param {Object} handlers - Event handlers
   * @returns {String} Channel name
   */
  subscribeTournament(tournamentId, handlers = {}) {
    const channelName = `tournament:${tournamentId}`;
    
    if (this.channels.has(channelName)) {
      console.log('Already subscribed to tournament:', tournamentId);
      return channelName;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('🏆 Tournament updated:', payload);
          if (handlers.onUpdate) {
            handlers.onUpdate(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('🏆 Participant joined:', payload);
          if (handlers.onPlayerJoined) {
            handlers.onPlayerJoined(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('🏆 Participant left:', payload);
          if (handlers.onPlayerLeft) {
            handlers.onPlayerLeft(payload.old);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('🏆 Match updated:', payload);
          if (handlers.onBracketUpdate) {
            handlers.onBracketUpdate(payload);
          }
        }
      )
      .subscribe((status) => {
        console.log(`🏆 Tournament subscription status for ${tournamentId}:`, status);
      });

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Subscribe to all tournaments list
   * @param {Object} handlers - Event handlers
   * @returns {String} Channel name
   */
  subscribeTournamentsList(handlers = {}) {
    const channelName = 'tournaments:list';
    
    if (this.channels.has(channelName)) {
      console.log('Already subscribed to tournaments list');
      return channelName;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tournaments'
        },
        (payload) => {
          console.log('🏆 New tournament created:', payload);
          if (handlers.onNew) {
            handlers.onNew(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments'
        },
        (payload) => {
          console.log('🏆 Tournament updated:', payload);
          if (handlers.onUpdate) {
            handlers.onUpdate(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('🏆 Tournaments list subscription status:', status);
      });

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Unsubscribe from a channel
   * @param {String} channelName
   */
  async unsubscribe(channelName) {
    const channel = this.channels.get(channelName);
    if (channel) {
      await supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log('🏆 Unsubscribed from:', channelName);
    }
  }

  /**
   * Unsubscribe from all channels EXCEPT specific tournament channels
   * This prevents closing tournament detail subscriptions when leaving the lobby
   */
  async unsubscribeAll() {
    for (const [name, channel] of this.channels.entries()) {
      // Skip tournament-specific channels - keep them active
      if (name.startsWith('tournament:')) {
        console.log('🏆 Keeping tournament channel alive:', name);
        continue;
      }
      await supabase.removeChannel(channel);
      console.log('🏆 Unsubscribed from:', name);
    }
    // Only clear non-tournament channels
    for (const [name] of this.channels.entries()) {
      if (!name.startsWith('tournament:')) {
        this.channels.delete(name);
      }
    }
  }
}

export default new TournamentService();
