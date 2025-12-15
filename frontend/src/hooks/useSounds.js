import { useEffect, useRef, useState } from 'react';

// Sound effects configuration
const SOUNDS = {
  hit: '/sounds/hit.mp3',
  miss: '/sounds/miss.mp3',
  shipSunk: '/sounds/ship-sunk.mp3',
  victory: '/sounds/victory.mp3',
  defeat: '/sounds/defeat.mp3',
  yourTurn: '/sounds/your-turn.mp3',
  click: '/sounds/click.mp3',
};

const useSounds = () => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('battleship_sound_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const audioRefs = useRef({});

  useEffect(() => {
    // Pre-load all sound files
    Object.entries(SOUNDS).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = 0.5; // Default volume
      audioRefs.current[key] = audio;
    });

    return () => {
      // Cleanup
      Object.values(audioRefs.current).forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  // Save sound preference to localStorage
  useEffect(() => {
    localStorage.setItem('battleship_sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const playSound = (soundName, volume = 0.5) => {
    if (!soundEnabled) return;

    const audio = audioRefs.current[soundName];
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
      audio.currentTime = 0; // Reset to start
      audio.play().catch((error) => {
        console.warn(`Failed to play sound: ${soundName}`, error);
      });
    }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => !prev);
  };

  // Game-specific sound effects
  const sounds = {
    hit: (volume) => playSound('hit', volume || 0.6),
    miss: (volume) => playSound('miss', volume || 0.4),
    shipSunk: (volume) => playSound('shipSunk', volume || 0.7),
    victory: (volume) => playSound('victory', volume || 0.8),
    defeat: (volume) => playSound('defeat', volume || 0.6),
    yourTurn: (volume) => playSound('yourTurn', volume || 0.5),
    click: (volume) => playSound('click', volume || 0.3),
  };

  return {
    soundEnabled,
    toggleSound,
    playSound,
    sounds,
  };
};

export default useSounds;
