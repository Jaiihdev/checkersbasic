const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

// Create HTTP server
const server = http.createServer((req, res) => {
    let filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.js') contentType = 'text/javascript';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Fallback to index.html for unknown routes (SPA support)
            if (req.url !== '/' && ext === '') {
                fs.readFile(path.join(publicDir, 'index.html'), (err2, data2) => {
                    if (err2) {
                        res.writeHead(500);
                        res.end('Error loading index.html');
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data2);
                });
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store active games
const games = new Map();

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch (data.type) {
            case 'createGame':
                handleCreateGame(ws, data);
                break;
            case 'joinGame':
                handleJoinGame(ws, data);
                break;
            case 'move':
                handleMove(ws, data);
                break;
            case 'chat':
                handleChat(ws, data);
                break;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        // Clean up game if player disconnects
        for (const [gameId, game] of games.entries()) {
            if (game.players.includes(ws)) {
                const otherPlayer = game.players.find(player => player !== ws);
                if (otherPlayer) {
                    otherPlayer.send(JSON.stringify({
                        type: 'opponentDisconnected'
                    }));
                }
                games.delete(gameId);
            }
        }
    });
});

function handleCreateGame(ws, data) {
    const gameId = generateGameId();
    const game = {
        id: gameId,
        players: [ws],
        board: initializeBoard(),
        currentPlayer: 'red'
    };
    games.set(gameId, game);
    
    ws.send(JSON.stringify({
        type: 'gameCreated',
        gameId: gameId,
        color: 'red'
    }));
}

function handleJoinGame(ws, data) {
    const game = games.get(data.gameId);
    if (!game) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Game not found'
        }));
        return;
    }

    if (game.players.length >= 2) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Game is full'
        }));
        return;
    }

    game.players.push(ws);
    ws.send(JSON.stringify({
        type: 'gameJoined',
        gameId: data.gameId,
        color: 'black',
        board: game.board
    }));

    // Notify first player that opponent has joined
    game.players[0].send(JSON.stringify({
        type: 'opponentJoined',
        board: game.board
    }));
}

function handleMove(ws, data) {
    const game = games.get(data.gameId);
    if (!game) return;

    // Validate move
    if (game.currentPlayer !== data.color) return;
    if (!isValidMove(game.board, data.move)) return;

    // Update board
    game.board = makeMove(game.board, data.move);
    game.currentPlayer = game.currentPlayer === 'red' ? 'black' : 'red';

    // Broadcast move to both players
    game.players.forEach(player => {
        player.send(JSON.stringify({
            type: 'move',
            move: data.move,
            board: game.board,
            currentPlayer: game.currentPlayer
        }));
    });
}

function handleChat(ws, data) {
    const game = games.get(data.gameId);
    if (!game) return;

    // Broadcast chat message to both players
    game.players.forEach(player => {
        player.send(JSON.stringify({
            type: 'chat',
            message: data.message,
            sender: data.sender
        }));
    });
}

function generateGameId() {
    return Math.random().toString(36).substring(2, 8);
}

function initializeBoard() {
    // Same board initialization logic as in the client
    const board = Array(8).fill().map(() => Array(8).fill(null));
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 !== 0) {
                if (row < 3) {
                    board[row][col] = { color: 'black', isKing: false };
                } else if (row > 4) {
                    board[row][col] = { color: 'red', isKing: false };
                }
            }
        }
    }
    return board;
}

function isValidMove(board, move) {
    // Same move validation logic as in the client
    // This is a simplified version - you should implement the full validation
    const { from, to } = move;
    const piece = board[from.row][from.col];
    if (!piece) return false;
    
    // Check if the move is diagonal
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    if (rowDiff !== colDiff) return false;
    
    // Check if the destination is empty
    if (board[to.row][to.col]) return false;
    
    return true;
}

function makeMove(board, move) {
    // Same move execution logic as in the client
    const { from, to } = move;
    const piece = board[from.row][from.col];
    board[to.row][to.col] = piece;
    board[from.row][from.col] = null;
    
    // Check for king promotion
    if ((to.row === 0 && piece.color === 'red') || (to.row === 7 && piece.color === 'black')) {
        piece.isKing = true;
    }
    
    return board;
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 