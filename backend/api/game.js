import { supabase } from '../config/supabase.js';

// Game API handler for Vercel serverless functions
export default async function handler(req, res) {
  // CORS headers - Allow all origins for now
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false'); // Set to false when origin is *
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, query, body } = req;
  const { action } = query;

  try {
    // Extract user info from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = user.id;
    const username = user.user_metadata?.username || user.email;

    // Route to appropriate handler based on action
    switch (action) {
      case 'getRooms':
        return await getRooms(req, res, userId);
        
      case 'createRoom':
        return await createRoom(req, res, userId, username, body);
        
      case 'joinRoom':
        return await joinRoom(req, res, userId, username, body);
        
      case 'leaveRoom':
        return await leaveRoom(req, res, userId, username, body);
        
      case 'placeShips':
        return await placeShips(req, res, userId, username, body);
        
      case 'attack':
        return await makeAttack(req, res, userId, username, body);
        
      case 'getGameState':
        return await getGameState(req, res, userId, query);
        
      case 'sendMessage':
        return await sendMessage(req, res, userId, username, body);
        
      case 'completeTournamentMatch':
        return await completeTournamentMatch(req, res, userId, body);
        
      default:
        return res.status(404).json({ 
          error: 'Action not found',
          availableActions: ['getRooms', 'createRoom', 'joinRoom', 'leaveRoom', 'placeShips', 'attack', 'getGameState', 'sendMessage', 'completeTournamentMatch']
        });
    }
  } catch (error) {
    console.error('Game API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Get available rooms
async function getRooms(req, res, userId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data: rooms, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('status', 'waiting')
    .eq('is_private', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get rooms: ${error.message}`);
  }

  return res.json({ rooms: rooms || [] });
}

// Create a new room
async function createRoom(req, res, userId, username, body) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { isPrivate = false } = body;
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Insert room into database
  const { data: room, error } = await supabase
    .from('game_rooms')
    .insert({
      id: roomId,
      is_private: isPrivate,
      status: 'waiting',
      player1_id: userId,
      player1_username: username
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create room: ${error.message}`);
  }

  // Create real-time event
  await supabase
    .from('game_events')
    .insert({
      event_type: 'room_created',
      room_id: roomId,
      user_id: userId,
      event_data: { room, isPrivate }
    });

  return res.json({ room });
}

// Join an existing room
async function joinRoom(req, res, userId, username, body) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = body;

  // Get the room
  const { data: room, error: fetchError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (fetchError || !room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // If user is already in the room (as player1 or player2), just return the room
  if (room.player1_id === userId || room.player2_id === userId) {
    return res.json({ room });
  }

  if (room.status !== 'waiting') {
    return res.status(400).json({ error: 'Room is not available for joining' });
  }

  if (room.player2_id) {
    return res.status(400).json({ error: 'Room is full' });
  }

  // Update room with second player
  const { data: updatedRoom, error: updateError } = await supabase
    .from('game_rooms')
    .update({
      player2_id: userId,
      player2_username: username,
      status: 'setup'
    })
    .eq('id', roomId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to join room: ${updateError.message}`);
  }

  // Create real-time event
  await supabase
    .from('game_events')
    .insert({
      event_type: 'room_joined',
      room_id: roomId,
      user_id: userId,
      event_data: { room: updatedRoom, userId, username }
    });

  return res.json({ room: updatedRoom });
}

// Leave a room
async function leaveRoom(req, res, userId, username, body) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = body;

  // Get the room
  const { data: room, error: fetchError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (fetchError || !room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Check if user is in the room
  if (room.player1_id !== userId && room.player2_id !== userId) {
    return res.status(403).json({ error: 'You are not in this room' });
  }

  // Don't delete rooms that are waiting for players - just let them stay open
  // Only delete/update if game has actually started (status is 'setup' or later)
  if (room.status === 'waiting' && room.player1_id === userId && !room.player2_id) {
    // Player1 leaving a waiting room - don't delete, keep it open for others
    // Just emit the leave event but keep the room
    await supabase
      .from('game_events')
      .insert({
        event_type: 'player_left',
        room_id: roomId,
        user_id: userId,
        event_data: { userId, username, temporary: true }
      });
    
    return res.json({ success: true, roomKept: true });
  }

  // If game has started or both players are present, handle leave properly
  if (!room.player2_id || room.player1_id === userId && room.status === 'waiting') {
    // Delete room if no second player and not waiting for one
    await supabase.from('game_rooms').delete().eq('id', roomId);
  } else {
    // Remove the player from the room
    const updates = room.player1_id === userId 
      ? { player1_id: room.player2_id, player1_username: room.player2_username, player2_id: null, player2_username: null }
      : { player2_id: null, player2_username: null };
    
    await supabase
      .from('game_rooms')
      .update({ ...updates, status: 'waiting' })
      .eq('id', roomId);
  }

  // Create real-time event
  await supabase
    .from('game_events')
    .insert({
      event_type: 'player_left',
      room_id: roomId,
      user_id: userId,
      event_data: { userId, username }
    });

  return res.json({ success: true });
}

// Place ships
async function placeShips(req, res, userId, username, body) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId, ships, board } = body;

  // Get the room
  const { data: room, error: fetchError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (fetchError || !room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Check if user is in the room
  if (room.player1_id !== userId && room.player2_id !== userId) {
    return res.status(403).json({ error: 'You are not in this room' });
  }

  // Validate room state if both players are present
  if (room.player1_id && room.player2_id && room.player1_id === room.player2_id) {
    return res.status(400).json({ error: 'Invalid room state: both players have the same ID' });
  }

  // Create or update game record
  let gameId = room.game_id;
  
  if (!gameId) {
    // Create new game - only include player2_id if it exists
    const gameData = {
      player1_id: room.player1_id,
      status: 'setup'
    };
    
    if (room.player2_id) {
      gameData.player2_id = room.player2_id;
    }
    
    const { data: newGame, error: gameError } = await supabase
      .from('games')
      .insert(gameData)
      .select()
      .single();

    if (gameError) {
      throw new Error(`Failed to create game: ${gameError.message}`);
    }

    gameId = newGame.id;

    // Update room with game_id
    await supabase
      .from('game_rooms')
      .update({ game_id: gameId })
      .eq('id', roomId);
  }

  // Update game with ships and board
  const isPlayer1 = room.player1_id === userId;
  const updateFields = isPlayer1 
    ? { player1_ships: ships, player1_board: board, player1_ready: true }
    : { player2_ships: ships, player2_board: board, player2_ready: true };
  
  // If this is player 2 and player2_id wasn't set in the game, set it now
  if (!isPlayer1 && room.player2_id) {
    updateFields.player2_id = room.player2_id;
  }

  const { data: updatedGame, error: updateError } = await supabase
    .from('games')
    .update(updateFields)
    .eq('id', gameId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update game: ${updateError.message}`);
  }

  // Check if both players are ready
  if (updatedGame.player1_ready && updatedGame.player2_ready) {
    // Start the game
    await supabase
      .from('games')
      .update({
        status: 'active',
        current_turn: updatedGame.player1_id,
        started_at: new Date().toISOString()
      })
      .eq('id', gameId);

    await supabase
      .from('game_rooms')
      .update({ status: 'playing' })
      .eq('id', roomId);

    // Emit game_started event for both players
    await supabase
      .from('game_events')
      .insert({
        event_type: 'game_started',
        game_id: gameId,
        room_id: roomId,
        user_id: userId,
        event_data: { 
          gameId, 
          firstPlayer: updatedGame.player1_id,
          status: 'active'
        }
      });
  }

  // Create real-time event for ships placed
  await supabase
    .from('game_events')
    .insert({
      event_type: 'ships_placed',
      game_id: gameId,
      room_id: roomId,
      user_id: userId,
      event_data: { gameId, userId, ready: true }
    });

  return res.json({ success: true, gameId });
}

// Make an attack
async function makeAttack(req, res, userId, username, body) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId, x, y } = body;

  // Get the game
  const { data: room } = await supabase
    .from('game_rooms')
    .select('game_id')
    .eq('id', roomId)
    .single();

  if (!room?.game_id) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('*')
    .eq('id', room.game_id)
    .single();

  if (fetchError || !game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Validate turn
  if (game.current_turn !== userId) {
    return res.status(400).json({ error: 'Not your turn' });
  }

  // Determine target and attacker
  const isPlayer1 = game.player1_id === userId;
  const targetBoard = isPlayer1 ? game.player2_board : game.player1_board;
  const targetShips = isPlayer1 ? game.player2_ships : game.player1_ships;

  // Check if position already attacked (check for hit or miss markers)
  if (targetBoard[y]?.[x] === 'hit' || targetBoard[y]?.[x] === 'miss') {
    return res.status(400).json({ error: 'Position already attacked' });
  }

  // Determine hit or miss by checking if there's a ship at this position
  const cellValue = targetBoard[y]?.[x];
  const isHit = cellValue === 'ship' || cellValue === 1 || cellValue === '1' || cellValue === true;
  const result = { hit: isHit, x, y };
  
  console.log('🎯 Attack check:', { x, y, cellValue, isHit, targetBoard: targetBoard[y] });

  // Update board
  const newBoard = JSON.parse(JSON.stringify(targetBoard));
  if (!newBoard[y]) newBoard[y] = {};
  newBoard[y][x] = isHit ? 'hit' : 'miss';

  // Check for ship sunk and game over
  // Count remaining ship cells (cells that are 'ship' and not 'hit')
  let remainingShipCells = 0;
  for (let row = 0; row < newBoard.length; row++) {
    for (let col = 0; col < newBoard[row].length; col++) {
      const cell = newBoard[row][col];
      // Count cells that still have ships (not yet hit)
      if (cell === 'ship' || cell === 1 || cell === '1' || cell === true) {
        remainingShipCells++;
      }
    }
  }
  
  const gameOver = remainingShipCells === 0;
  const winner = gameOver ? userId : null; // Attacker wins if all opponent ships are destroyed
  
  console.log('🏁 Win check:', { 
    remainingShipCells, 
    gameOver, 
    winner, 
    attackerId: userId,
    isPlayer1 
  });

  // Update game state
  const nextTurn = isHit ? userId : (isPlayer1 ? game.player2_id : game.player1_id);
  const updateFields = {
    current_turn: gameOver ? null : nextTurn,
    turn_count: game.turn_count + 1,
    ...(isPlayer1 ? { player2_board: newBoard } : { player1_board: newBoard }),
    ...(gameOver ? { status: 'completed', winner_id: winner, ended_at: new Date().toISOString() } : {})
  };

  await supabase
    .from('games')
    .update(updateFields)
    .eq('id', game.id);

  // Create real-time event
  const eventPayload = {
    event_type: gameOver ? 'game_over' : 'attack_made',
    game_id: game.id,
    room_id: roomId,
    user_id: userId,
    event_data: { 
      x, y, 
      result: { ...result, gameOver, winner },
      attackerId: userId,
      nextTurn: gameOver ? null : nextTurn
    }
  };

  const { data: eventData, error: eventError } = await supabase
    .from('game_events')
    .insert(eventPayload)
    .select();

  if (eventError) {
    console.error('❌ Error inserting game event:', eventError);
  } else {
    console.log('✅ Game event inserted:', eventData);
    
    // Also broadcast directly to the game channel as a backup
    try {
      const channel = supabase.channel(`game_${game.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'attack_made',
        payload: eventPayload.event_data
      });
      console.log('📡 Broadcasted attack event to channel');
    } catch (broadcastError) {
      console.error('❌ Broadcast error:', broadcastError);
    }
  }

  return res.json({ result: { ...result, gameOver, winner, nextTurn } });
}

// Get game state
async function getGameState(req, res, userId, query) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = query;

  const { data: room } = await supabase
    .from('game_rooms')
    .select('game_id')
    .eq('id', roomId)
    .single();

  if (!room?.game_id) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', room.game_id)
    .single();

  if (error || !game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Return appropriate game state for the user
  const isPlayer1 = game.player1_id === userId;
  const gameState = {
    id: game.id,
    gameId: game.id,
    status: game.status,
    player1_id: game.player1_id,
    player2_id: game.player2_id,
    player1_ready: game.player1_ready,
    player2_ready: game.player2_ready,
    player1_ships: game.player1_ships,
    player2_ships: game.player2_ships,
    player1_board: game.player1_board,
    player2_board: game.player2_board,
    isPlayer1,
    current_turn: game.current_turn,
    turnCount: game.turn_count,
    myBoard: isPlayer1 ? game.player1_board : game.player2_board,
    opponentBoard: isPlayer1 ? game.player2_board : game.player1_board,
    myShips: isPlayer1 ? game.player1_ships : game.player2_ships,
    winner: game.winner_id
  };

  return res.json({ gameState });
}

// Send chat message
async function sendMessage(req, res, userId, username, body) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId, gameId, message } = body;

  if (!message || message.length > 200) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  // Insert chat message
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      game_id: gameId,
      user_id: userId,
      username: username,
      message: message.trim()
    });

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }

  return res.json({ success: true });
}

// Complete tournament match - uses service role to bypass connection pool issues
async function completeTournamentMatch(req, res, userId, body) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matchId, winnerId } = body;

  if (!matchId || !winnerId) {
    return res.status(400).json({ error: 'matchId and winnerId are required' });
  }

  console.log('🏆 Backend: completeTournamentMatch called:', { matchId, winnerId, userId });
  console.log('🏆 Backend: Starting try block...');

  try {
    // Step 1: Get match details
    console.log('🏆 Backend: Step 1 - Fetching match details...');
    console.log('🏆 Backend: About to query tournament_matches...');
    
    const { data: match, error: matchError } = await supabase
      .from('tournament_matches')
      .select('id, tournament_id, round, match_number, bracket_position, status, winner_id, player1_id, player2_id')
      .eq('id', matchId)
      .single();

    console.log('🏆 Backend: Query complete');
    console.log('🏆 Backend: matchError:', matchError);
    console.log('🏆 Backend: match:', match);

    if (matchError) {
      console.error('🏆 Backend: Error fetching match:', matchError);
      throw new Error(`Failed to fetch match: ${matchError.message}`);
    }

    if (!match) {
      console.log('🏆 Backend: Match not found, returning 404');
      return res.status(404).json({ error: 'Match not found' });
    }

    console.log('🏆 Backend: Match found:', match);

    // Check if match is already completed
    if (match.status === 'completed') {
      console.log('🏆 Backend: Match already completed, returning early');
      return res.status(200).json({ 
        success: true, 
        alreadyCompleted: true,
        match: {
          id: match.id,
          status: 'completed',
          winner_id: match.winner_id,
          round: match.round
        },
        timestamp: new Date().toISOString()
      });
    }

    // Verify the winner is one of the players
    if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
      console.log('🏆 Backend: Winner verification failed');
      return res.status(400).json({ error: 'Winner must be one of the match players' });
    }

    // Step 2: Update match status to completed
    console.log('🏆 Backend: Step 2 - Updating match status...');
    console.log('🏆 Backend: About to update tournament_matches...');
    
    const { error: updateError } = await supabase
      .from('tournament_matches')
      .update({
        status: 'completed',
        winner_id: winnerId,
        completed_at: new Date().toISOString()
      })
      .eq('id', matchId)
      .in('status', ['ready', 'in_progress']); // Allow update from ready or in_progress (not completed)

    console.log('🏆 Backend: Update complete');
    console.log('🏆 Backend: updateError:', updateError);

    if (updateError) {
      console.error('🏆 Backend: Error updating match:', updateError);
      throw new Error(`Failed to update match: ${updateError.message}`);
    }

    console.log('🏆 Backend: ✅ Match status updated');

    // Step 3: Advance winner to next round (if not finals)
    // IMPORTANT: match.round is an INTEGER (1, 2, 3, etc.), not a string
    console.log('🏆 Backend: Step 3 - Checking if winner should advance...');
    console.log('🏆 Backend: Current round (integer):', match.round);
    console.log('🏆 Backend: Match number:', match.match_number);
    console.log('🏆 Backend: Bracket position:', match.bracket_position);
    
    // Get tournament to determine total rounds
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('max_players')
      .eq('id', match.tournament_id)
      .single();
    
    if (tournamentError) {
      console.error('🏆 Backend: Error fetching tournament:', tournamentError);
      throw new Error(`Failed to fetch tournament: ${tournamentError.message}`);
    }
    
    const totalRounds = Math.log2(tournament.max_players);
    console.log('🏆 Backend: Total rounds:', totalRounds);
    console.log('🏆 Backend: Current round number:', match.round);
    
    // If this is NOT the final round, advance winner
    if (match.round < totalRounds) {
      console.log('🏆 Backend: Not finals - advancing winner to next round...');
      
      // Find the next match where winner should be placed
      const isPlayer1 = match.bracket_position.endsWith('-M1') || match.bracket_position.endsWith('-M3');
      const nextMatchNumber = Math.ceil(parseInt(match.match_number) / 2);
      
      console.log('🏆 Backend: isPlayer1:', isPlayer1);
      console.log('🏆 Backend: nextMatchNumber:', nextMatchNumber);
      
      // Generate next round bracket position
      const nextRound = match.round + 1;
      const roundsFromEnd = totalRounds - nextRound;
      let nextRoundLabel;
      
      if (roundsFromEnd === 0) {
        nextRoundLabel = 'FINAL';
      } else if (roundsFromEnd === 1) {
        nextRoundLabel = 'SF';
      } else if (roundsFromEnd === 2) {
        nextRoundLabel = 'QF';
      } else {
        nextRoundLabel = `R${nextRound}`;
      }
      
      console.log('🏆 Backend: Next round number:', nextRound);
      console.log('🏆 Backend: Next round label:', nextRoundLabel);

      const nextMatchPosition = `${nextRound}-M${nextMatchNumber}`;
      console.log('🏆 Backend: Next match position:', nextMatchPosition);

      console.log('🏆 Backend: Advancing to next match:', nextMatchPosition);
      console.log('🏆 Backend: About to update next match...');

      const updateField = isPlayer1 ? 'player1_id' : 'player2_id';
      const { error: advanceError } = await supabase
        .from('tournament_matches')
        .update({ [updateField]: winnerId })
        .eq('tournament_id', match.tournament_id)
        .eq('bracket_position', nextMatchPosition);

      console.log('🏆 Backend: Next match update complete');
      console.log('🏆 Backend: advanceError:', advanceError);

      if (advanceError) {
        console.error('🏆 Backend: Error advancing winner:', advanceError);
        throw new Error(`Failed to advance winner: ${advanceError.message}`);
      }

      console.log('🏆 Backend: ✅ Winner advanced to next round');
    } else {
      console.log('🏆 Backend: Finals completed - tournament winner:', winnerId);
      
      // CRITICAL: Mark tournament as completed with winner
      console.log('🏆 Backend: Marking tournament as completed...');
      const { error: tournamentCompleteError } = await supabase
        .from('tournaments')
        .update({
          status: 'completed',
          winner_id: winnerId
        })
        .eq('id', match.tournament_id);

      if (tournamentCompleteError) {
        console.error('🏆 Backend: Error marking tournament as completed:', tournamentCompleteError);
        throw new Error(`Failed to mark tournament as completed: ${tournamentCompleteError.message}`);
      }

      console.log('🏆 Backend: ✅ Tournament marked as completed with winner:', winnerId);
    }    // Step 4: Update tournament match count
    console.log('🏆 Backend: Step 4 - Updating tournament match count...');
    console.log('🏆 Backend: About to call increment_completed_matches RPC...');
    
    const { error: countError } = await supabase.rpc('increment_completed_matches', {
      tournament_id_param: match.tournament_id
    });

    console.log('🏆 Backend: RPC complete');
    console.log('🏆 Backend: countError:', countError);

    if (countError) {
      console.warn('🏆 Backend: Could not increment match count (non-critical):', countError.message);
    } else {
      console.log('🏆 Backend: ✅ Match count incremented');
    }

    console.log('🏆 Backend: ✅ Match completion successful');
    console.log('🏆 Backend: Preparing response...');

    const responseData = {
      success: true,
      match: {
        id: match.id,
        status: 'completed',
        winner_id: winnerId,
        round: match.round
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('🏆 Backend: Sending response:', responseData);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('🏆 Backend: Error completing match:', error);
    console.error('🏆 Backend: Error message:', error.message);
    console.error('🏆 Backend: Error stack:', error.stack);
    return res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
  }
}