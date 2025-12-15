# 🚢 Battleship PvP - Multiplayer Battleship Game

**Status**: ✅ Production Ready | **Version**: 1.0.0

A feature-complete, real-time multiplayer Battleship game built with React, Node.js, Socket.IO, and Supabase.

Perfect for tournament play with classmates!

## ✨ Highlights

- ⚡ **Real-time multiplayer** with Socket.IO
- 🎯 **Complete game mechanics** - Ship placement, attacks, win detection
- 💬 **In-game chat** with typing indicators
- 🔔 **Notifications** & 🔊 **Sound effects** (toggleable)
- 👤 **User profiles** with statistics
- 🎨 **Beautiful UI** with design tokens
- 🧪 **Testing suite** included
- 🚀 **Deployment ready** (Vercel + Railway/Render)

## 🎮 Core Features

### Gameplay
- ✅ 10x10 game board with coordinate system (A1-J10)
- ✅ 5 ships: Carrier(5), Battleship(4), Cruiser(3), Submarine(3), Destroyer(2)
- ✅ Drag & drop ship placement with rotation
- ✅ Real-time hit/miss detection
- ✅ Ship sunk animations and notifications
- ✅ Turn-based gameplay with 30-second timer
- ✅ Win/loss detection
- ✅ Move history log

### Multiplayer
- ✅ Lobby system with room list
- ✅ Create public/private rooms
- ✅ Quick match functionality
- ✅ Room codes for private games
- ✅ Player ready status
- ✅ Disconnect/reconnect handling

### Social & UX
- ✅ Real-time chat during games
- ✅ Typing indicators
- ✅ Toast notifications for game events
- ✅ Sound effects (hit, miss, victory, etc.)
- ✅ User profiles with avatars
- ✅ Win/loss statistics
- ✅ Loading states & error handling
- ✅ Responsive design
- ✅ Dark mode support

### Developer Features
- ✅ Comprehensive testing suite (Vitest)
- ✅ Performance monitoring utilities
- ✅ Error boundary for graceful failures
- ✅ Code splitting ready
- ✅ TypeScript-ready architecture
- ✅ Design tokens system

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite 7** - Build tool & dev server
- **Tailwind CSS v4** - Utility-first styling with design tokens
- **Zustand** - Lightweight state management
- **Socket.io-client 4** - Real-time communication
- **@supabase/supabase-js** - Authentication & database
- **React Router 7** - Client-side routing
- **React Toastify** - Toast notifications
- **Vitest** - Testing framework

### Backend
- **Node.js 18+** - Runtime environment
- **Express 4** - HTTP server framework
- **Socket.io 4** - WebSocket server
- **Supabase** - PostgreSQL database & auth
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment configuration

### Database & Services
- **Supabase (PostgreSQL)** - Primary database
- **Supabase Auth** - User authentication & JWT
- **Supabase Storage** - Avatar uploads
- **Supabase Realtime** - Database subscriptions

## 📋 Prerequisites

Before running this project, make sure you have:

- ✅ Node.js 18+ installed
- ✅ npm or yarn package manager
- ✅ A Supabase account (free tier works!)
- ✅ Supabase credentials (URL and API keys)
- ✅ Git installed
- ✅ Code editor (VS Code recommended)

## 📚 Documentation

- **QUICK_START.md** - Get running in 5 minutes
- **PROJECT_COMPLETE.md** - Full feature list & status
- **DEPLOYMENT_GUIDE.md** - Production deployment
- **BUILD_FIX_SUMMARY.md** - Tailwind v4 fixes
- **PHASE_*_COMPLETE.md** - Implementation details

## 🚀 Getting Started

> **Quick Start**: See `QUICK_START.md` for detailed setup instructions

### 1. Clone & Install

```bash
git clone <repository-url>
cd battleship_pvp

# Install frontend
cd frontend && npm install

# Install backend
cd ../backend && npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` in both frontend and backend directories:

```bash
# Frontend
cd frontend
cp .env.example .env

# Backend
cd ../backend
cp .env.example .env
```

Then edit the `.env` files with your Supabase credentials.

### 3. Setup Database

1. Create a Supabase project at https://supabase.com
2. Navigate to SQL Editor in Supabase dashboard
3. Run the migration scripts from `/database/schema.sql`

### 4. Run the App

Open **two terminal windows**:

```bash
# Terminal 1: Backend
cd backend
npm start
# → Server on http://localhost:3001

# Terminal 2: Frontend
cd frontend
npm run dev
# → App on http://localhost:5173
```

### 5. Play!

1. Open http://localhost:5173
2. Sign up for an account
3. Click "Play Now" → "Create Public Room"
4. Open incognito window, sign up with different account
5. Join the room and start playing!

## 📁 Project Structure

```
battleship_pvp/
├── frontend/                      # React + Vite frontend
│   ├── src/
│   │   ├── components/           # UI components (21 files)
│   │   │   ├── GameBoard.jsx
│   │   │   ├── ShipPlacementBoard.jsx
│   │   │   ├── ChatPanel.jsx
│   │   │   ├── Lobby.jsx
│   │   │   └── ...
│   │   ├── hooks/                # Custom hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useNotification.js
│   │   │   └── useSounds.js
│   │   ├── stores/               # Zustand stores
│   │   │   ├── authStore.js
│   │   │   ├── gameStore.js
│   │   │   └── chatStore.js
│   │   ├── services/             # API services
│   │   │   ├── socket.js
│   │   │   └── supabase.js
│   │   ├── utils/                # Utilities
│   │   │   ├── gameHelpers.js
│   │   │   ├── performanceMonitor.js
│   │   │   └── debounce.js
│   │   ├── styles/               # Design system
│   │   │   └── designTokens.js
│   │   ├── test/                 # Tests
│   │   └── App.jsx
│   ├── public/
│   │   └── sounds/              # Sound effects
│   ├── vercel.json              # Vercel config
│   └── vitest.config.js         # Test config
│
├── backend/                      # Node.js + Express backend
│   ├── config/
│   │   └── supabase.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── socketAuth.js
│   ├── routes/
│   │   └── profileRoutes.js
│   ├── gameManager.js           # Core game logic
│   ├── server.js                # Main server + Socket.IO
│   ├── railway.json             # Railway config
│   └── render.yaml              # Render config
│
├── database/                     # SQL schemas
│   └── schema.sql
│
├── docs/                        # Documentation
│   ├── QUICK_START.md
│   ├── PROJECT_COMPLETE.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── BUILD_FIX_SUMMARY.md
│
└── README.md                    # This file
```

## 🎯 Game Rules

1. Each player has 5 ships to place on a 10x10 grid:
   - Carrier (5 cells)
   - Battleship (4 cells)
   - Cruiser (3 cells)
   - Submarine (3 cells)
   - Destroyer (2 cells)

2. Players take turns attacking cells on the opponent's grid
3. First player to sink all opponent ships wins

## 🧪 Testing

The project includes a comprehensive testing suite:

```bash
# Run all tests
cd frontend
npm test

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

**Test Coverage**:
- Component rendering tests
- User interaction tests
- Game logic validation
- Ship placement validation
- Hit/miss detection tests

## 📦 Building for Production

### Frontend Build
```bash
cd frontend
npm run build
# → Output in dist/
npm run preview  # Preview production build
```

**Build Output**:
- Total Size: ~592 KB
- Gzipped: ~168 KB
- Build Time: ~900ms

### Backend Production
```bash
cd backend
NODE_ENV=production npm start
```

## 🚀 Deployment

**Platforms Supported**:
- ✅ **Frontend**: Vercel (recommended)
- ✅ **Backend**: Railway or Render
- ✅ **Database**: Supabase (managed)

**Deployment Guides**:
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `DEPLOYMENT_QUICK_START.md` - Quick deploy in 10 minutes
- `VERCEL_DEPLOYMENT_GUIDE.md` - Vercel-specific guide

**Configuration Files Included**:
- `vercel.json` - Vercel configuration
- `railway.json` - Railway configuration
- `render.yaml` - Render configuration

## 🎯 Available Scripts

### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Run ESLint |

### Backend
| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (auto-reload) |

## 🏗️ Development Status

**Current Version**: 1.0.0
**Status**: ✅ Production Ready
**Last Updated**: October 2025

**Completed Phases**:
- ✅ Phase 1: Project Setup & Structure
- ✅ Phase 2: Authentication & User Management
- ✅ Phase 3: Game UI & Frontend Logic
- ✅ Phase 4: Backend - Socket.IO & Game Logic
- ✅ Phase 5: Real-time Features & Polish
- ✅ Phase 6: Testing, Optimization & Deployment

**Total**: ~10,000 lines of production-ready code

## 🆘 Troubleshooting

### Common Issues

**Build fails with Tailwind error**
- Solution: Install `@tailwindcss/postcss`
- See `BUILD_FIX_SUMMARY.md`

**Socket connection fails**
- Check backend is running on port 3001
- Verify `VITE_SOCKET_URL` in frontend/.env
- Check CORS configuration

**Can't sign up/login**
- Verify Supabase credentials in .env
- Check Supabase Auth is enabled
- Review browser console for errors

See `QUICK_START.md` for more troubleshooting tips.

## 📞 Support

- **Documentation**: Check `/docs` folder
- **Issues**: Review error messages and logs
- **Deployment**: See `DEPLOYMENT_GUIDE.md`

## 🤝 Contributing

This is a tournament game for classmates. Feel free to:
- Report bugs
- Suggest features
- Improve documentation
- Share your game stats!

## 📝 License

ISC - Free for educational and tournament use

## 👥 Credits

Built with modern web technologies for competitive tournament play among classmates.

**Tech Stack**: React 19, Node.js, Socket.IO, Supabase, Tailwind CSS v4

---

**🎮 Ready to deploy and start your tournament!**

See `DEPLOYMENT_GUIDE.md` to go live in production.

Made with ❤️ for friendly competition ⚓
