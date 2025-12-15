# Sound Assets Guide

This directory contains sound effects for the Battleship game.

## Required Sound Files

Place the following sound files in this directory:

1. **hit.mp3** - Sound when attack hits a ship
2. **miss.mp3** - Sound when attack misses
3. **ship-sunk.mp3** - Sound when a ship is completely sunk
4. **victory.mp3** - Sound when player wins the game
5. **defeat.mp3** - Sound when player loses the game
6. **your-turn.mp3** - Sound to notify it's player's turn
7. **click.mp3** - UI click sound

## Where to Find Sound Effects

### Free Sound Resources:
- **Freesound.org** - https://freesound.org (requires free account)
- **Mixkit** - https://mixkit.co/free-sound-effects/
- **Zapsplat** - https://www.zapsplat.com (requires free account)
- **Soundbible** - http://soundbible.com

### Recommended Search Terms:
- hit.mp3: "explosion", "impact", "hit"
- miss.mp3: "splash", "water drop", "miss"
- ship-sunk.mp3: "ship sinking", "explosion heavy", "destruction"
- victory.mp3: "victory fanfare", "win jingle", "success"
- defeat.mp3: "game over", "fail", "loss"
- your-turn.mp3: "notification", "bell", "alert"
- click.mp3: "button click", "UI click", "menu select"

## File Specifications

- **Format**: MP3
- **Duration**: 0.5 - 3 seconds (except victory/defeat which can be longer)
- **Quality**: 128kbps or higher
- **Volume**: Normalized (not too loud or too quiet)

## Creating Placeholder Sounds

If you don't have sound files yet, the game will still work but without audio.
The useSounds hook gracefully handles missing audio files.

## Testing Sounds

After adding sound files:
1. Start the development server
2. Enable sounds in game settings
3. Test each sound:
   - hit: Attack and hit a ship
   - miss: Attack and miss
   - ship-sunk: Sink an entire ship
   - victory: Win a game
   - defeat: Lose a game
   - your-turn: Wait for your turn notification
   - click: Click UI buttons

## Volume Levels

Default volumes are set in useSounds.js:
- hit: 0.6 (60%)
- miss: 0.4 (40%)
- ship-sunk: 0.7 (70%)
- victory: 0.8 (80%)
- defeat: 0.6 (60%)
- your-turn: 0.5 (50%)
- click: 0.3 (30%)

You can adjust these in the useSounds hook if needed.
