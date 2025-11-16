# Hidden Marks

A multiplayer card game built with the PERN stack (PostgreSQL, Express, React, Node.js) where players are assassins trying to eliminate each other while keeping their hidden identities secret.

## Game Overview

Hidden Marks is a strategic card game for 4 players where:
- Each player has a hidden mark (identity) that others must discover
- Players use cards to peek at marks, kill opponents, and protect themselves
- Be the last player alive to win!

## Features

- **Real-time multiplayer** using Socket.IO
- **Draggable poker-size cards** with React DnD
- **Session management** - Create private or public games
- **Public matchmaking** - Join ongoing public games
- **Full game logic** - All 48 cards with unique effects implemented
- **Responsive UI** - Beautiful gradient design with smooth animations

## Tech Stack

- **Frontend:** React 18, React Router, React DnD
- **Backend:** Node.js, Express, Socket.IO
- **Database:** PostgreSQL
- **Real-time:** WebSockets (Socket.IO)

## Installation

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hiddenmarks
   ```

2. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb hiddenmarks

   # Run the schema
   psql hiddenmarks < server/database/schema.sql
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file in the root directory
   cp .env.example .env

   # Edit .env with your database credentials
   PORT=5000
   DATABASE_URL=postgresql://username:password@localhost:5432/hiddenmarks
   NODE_ENV=development
   ```

4. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

5. **Run the application**

   In separate terminals:

   **Terminal 1 - Backend:**
   ```bash
   cd server
   npm run dev
   ```

   **Terminal 2 - Frontend:**
   ```bash
   cd client
   npm start
   ```

6. **Access the game**
   - Open your browser to `http://localhost:3000`
   - Create a session or join a public game
   - Invite 3 friends to join (4 players required)
   - Start playing!

## How to Play

### Setup
- Each player receives 3 cards in hand and a hidden mark
- There's a draw pile, and an extra unused mark

### Turn Structure
Each turn you have 3 actions. You can:
1. **DRAW** - Take a card from the draw pile
2. **BANK** - Place a card face-down in your bank (for currency)
3. **PLAY** - Pay the cost and use a card's effect

### Card Types

**White Cards (Value 1):**
- UNMASKED (Cost 3) - Peek at another player's mark
- GREED (Cost 0) - Draw 2 cards
- TRADE OFF (Cost 3) - Swap cards
- INSOMNIA (Cost 3) - Take 3 extra actions
- And more...

**Blue Cards (Value 2):**
- SNUB (Cost 5) - Block a card effect
- ARSON (Cost 5) - Destroy a player's bank
- UPHEAVAL (Cost 5) - Cut the deck
- LETHAL CARDS (Cost 10) - Kill under specific conditions

**Red Cards (Value 3):**
- BOUNTIES (Cost 0) - Draw 3 cards, place bounty
- LETHAL CARDS (Cost 10) - Kill under specific conditions

### Winning
- Eliminate all other players by:
  - Using lethal cards (meeting their conditions)
  - Making correct bounty accusations
  - Surviving the last draw accusation

## Game Controls

- **Click a card** - Play it (if it's your turn)
- **Right-click a card** - Bank it (if it's your turn)
- **Drag & drop** - Move cards between zones
- **Action buttons** - Draw cards or make accusations

## Project Structure

```
hiddenmarks/
├── server/
│   ├── src/
│   │   ├── controllers/    # Game logic controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Game utilities and card definitions
│   │   ├── config/         # Database configuration
│   │   └── server.js       # Main server file
│   ├── database/
│   │   └── schema.sql      # Database schema
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── styles/         # CSS files
│   │   ├── utils/          # API and socket utilities
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   └── package.json
└── README.md
```

## Development

- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:3000`
- Socket.IO handles real-time updates
- PostgreSQL stores game state

## Future Enhancements

- AI opponents for single-player mode
- Spectator mode
- Game replays
- Player statistics and leaderboards
- Mobile app version
- Tournament mode

## License

See LICENSE file for details.

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.