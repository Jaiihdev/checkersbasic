#  Checkers Web App

A web-based checkers game supporting both multiplayer (via WebSockets) and single-player (vs computer AI) modes. Built with vanilla JavaScript, HTML, and CSS—no frontend dependencies required.

## Features
- **Multiplayer:** Play with a friend over the internet using real-time WebSockets.
- **Single Player:** Play against a computer AI with three difficulty levels (Easy, Medium, Hard).
- **Chat:** In-game chat for multiplayer matches.
- **Responsive UI:** Clean, modern interface.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher recommended)

### Installation
1. **Clone the repository or download the source code.**
2. **Install dependencies:**
   ```bash
   npm install
   ```

### Running the App
Start the server:
```bash
npm start
```

Open your browser and go to:
```
http://localhost:3000
```

## Usage
- **Single Player:** Click "Play vs Computer" and select a difficulty.
- **Multiplayer:**
  - Player 1: Click "Create New Game" and share the Game ID.
  - Player 2: Enter the Game ID and click "Join Game".
  - Use the chat to communicate during the game.

## Deployment
1. **Choose a server or cloud platform** (VPS, Heroku, Render, etc.).
2. **Upload your files** and install dependencies (`npm install`).
3. **Start the server** (`npm start`).
4. **(Optional) Set up a reverse proxy and HTTPS** for production use.

## Project Structure
- `index.html` — Main HTML file
- `styles.css` — App styling
- `script.js` — Game logic and client-side code
- `server.js` — Node.js WebSocket and static file server
- `package.json` — Project metadata and dependencies

## License
MIT 
