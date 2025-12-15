// Design Tokens for Battleship PVP
// Centralized design system for consistent UI

export const designTokens = {
  // Colors - Ocean/Naval Theme
  colors: {
    // Primary - Deep Ocean Blue
    primary: {
      50: '#e6f1ff',
      100: '#b3d9ff',
      200: '#80c1ff',
      300: '#4da9ff',
      400: '#1a91ff',
      500: '#0070e6', // Main
      600: '#0059b3',
      700: '#004280',
      800: '#002b4d',
      900: '#00141a',
    },

    // Secondary - Teal/Aqua
    secondary: {
      50: '#e6f9f9',
      100: '#b3f0f0',
      200: '#80e7e7',
      300: '#4ddede',
      400: '#1ad5d5',
      500: '#00b8b8', // Main
      600: '#009393',
      700: '#006e6e',
      800: '#004949',
      900: '#002424',
    },

    // Neutral - Grays
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },

    // Game States
    game: {
      water: '#1e40af', // Water background
      waterLight: '#3b82f6', // Lighter water
      ship: '#374151', // Ship color
      shipHover: '#4b5563', // Ship hover
      hit: '#dc2626', // Hit marker
      miss: '#6b7280', // Miss marker
      sunk: '#991b1b', // Sunk ship
      valid: '#10b981', // Valid placement
      invalid: '#ef4444', // Invalid placement
    },

    // Semantic Colors
    success: {
      light: '#d1fae5',
      main: '#10b981',
      dark: '#059669',
    },
    error: {
      light: '#fee2e2',
      main: '#ef4444',
      dark: '#dc2626',
    },
    warning: {
      light: '#fef3c7',
      main: '#f59e0b',
      dark: '#d97706',
    },
    info: {
      light: '#dbeafe',
      main: '#3b82f6',
      dark: '#2563eb',
    },
  },

  // Typography
  typography: {
    fontFamily: {
      sans: "'Inter', 'system-ui', 'sans-serif'",
      mono: "'Fira Code', 'monospace'",
      display: "'Poppins', 'sans-serif'",
    },

    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
    },

    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },

    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },

  // Spacing - 4px base unit
  spacing: {
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
    24: '6rem',    // 96px
    32: '8rem',    // 128px
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',

    // Game-specific shadows
    cellHover: '0 0 10px rgba(59, 130, 246, 0.5)',
    shipPlacement: '0 4px 12px rgba(0, 0, 0, 0.3)',
    hit: '0 0 15px rgba(220, 38, 38, 0.6)',
    miss: '0 0 10px rgba(107, 114, 128, 0.4)',
  },

  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Z-Index
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Game-specific tokens
  game: {
    gridSize: 10,
    cellSize: '40px',
    cellSizeMobile: '32px',
    boardGap: '2px',
    shipSizes: {
      carrier: 5,
      battleship: 4,
      cruiser: 3,
      submarine: 3,
      destroyer: 2,
    },
    turnTime: 30, // seconds
    animationDuration: {
      attack: '300ms',
      hit: '500ms',
      sunk: '700ms',
    },
  },
};

// Helper function to get nested token values
export const getToken = (path) => {
  return path.split('.').reduce((obj, key) => obj?.[key], designTokens);
};

// Export individual token groups for convenience
export const {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  game,
} = designTokens;

export default designTokens;
