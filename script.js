class CheckersGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.validMoves = [];
        this.ws = null;
        this.gameId = null;
        this.playerColor = null;
        this.opponentConnected = false;
        this.singlePlayer = false;
        this.humanColor = 'red';
        this.computerColor = 'black';
        this.difficulty = 'easy';
        
        this.initializeBoard();
        this.setupEventListeners();
        this.setupWebSocket();
        this.updateCurrentPlayer();
    }

    setupWebSocket() {
        this.ws = new WebSocket('ws://localhost:3000');

        this.ws.onopen = () => {
            console.log('Connected to server');
            document.getElementById('game-status').textContent = 'Connected to server';
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            document.getElementById('game-status').textContent = 'Disconnected from server';
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            document.getElementById('game-status').textContent = 'Connection error';
        };
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'gameCreated':
                this.handleGameCreated(data);
                break;
            case 'gameJoined':
                this.handleGameJoined(data);
                break;
            case 'opponentJoined':
                this.handleOpponentJoined(data);
                break;
            case 'move':
                this.handleOpponentMove(data);
                break;
            case 'chat':
                this.handleChatMessage(data);
                break;
            case 'opponentDisconnected':
                this.handleOpponentDisconnected();
                break;
            case 'error':
                this.handleError(data);
                break;
        }
    }

    handleGameCreated(data) {
        this.gameId = data.gameId;
        this.playerColor = data.color;
        document.getElementById('game-status').textContent = `Game created! ID: ${this.gameId}`;
        document.getElementById('create-game').disabled = true;
    }

    handleGameJoined(data) {
        this.gameId = data.gameId;
        this.playerColor = data.color;
        this.board = data.board;
        this.opponentConnected = true;
        this.updateBoard();
        document.getElementById('game-status').textContent = 'Game joined!';
        document.getElementById('join-game').disabled = true;
        document.getElementById('game-id').disabled = true;
    }

    handleOpponentJoined(data) {
        this.opponentConnected = true;
        this.board = data.board;
        this.updateBoard();
        document.getElementById('game-status').textContent = 'Opponent joined!';
    }

    handleOpponentMove(data) {
        this.board = data.board;
        this.currentPlayer = data.currentPlayer;
        this.updateBoard();
        this.updateCurrentPlayer();
    }

    handleChatMessage(data) {
        this.addChatMessage(data.message, data.sender);
    }

    handleOpponentDisconnected() {
        this.opponentConnected = false;
        document.getElementById('game-status').textContent = 'Opponent disconnected';
    }

    handleError(data) {
        document.getElementById('game-status').textContent = `Error: ${data.message}`;
    }

    initializeBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            this.board[row] = [];
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                if ((row + col) % 2 !== 0) {
                    if (row < 3) {
                        this.board[row][col] = { color: 'black', isKing: false };
                        this.createPiece(square, 'black');
                    } else if (row > 4) {
                        this.board[row][col] = { color: 'red', isKing: false };
                        this.createPiece(square, 'red');
                    } else {
                        this.board[row][col] = null;
                    }
                } else {
                    this.board[row][col] = null;
                }

                boardElement.appendChild(square);
            }
        }
    }

    createPiece(square, color) {
        const piece = document.createElement('div');
        piece.className = `piece ${color}`;
        square.appendChild(piece);
    }

    setupEventListeners() {
        document.getElementById('reset-game').addEventListener('click', () => this.resetGame());
        document.getElementById('board').addEventListener('click', (e) => this.handleClick(e));
        document.getElementById('create-game').addEventListener('click', () => this.createGame());
        document.getElementById('join-game').addEventListener('click', () => this.joinGame());
        document.getElementById('send-message').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        document.getElementById('play-vs-computer').addEventListener('click', () => this.startSinglePlayer());
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
        });
    }

    handleClick(event) {
        const square = event.target.closest('.square');
        if (!square) return;

        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);

        if (this.selectedPiece) {
            if (this.isValidMove(row, col)) {
                this.makeMove(row, col);
            } else {
                this.clearSelection();
                if (this.isValidPiece(row, col)) {
                    this.selectPiece(row, col);
                }
            }
        } else if (this.isValidPiece(row, col)) {
            this.selectPiece(row, col);
        }
    }

    isValidPiece(row, col) {
        const piece = this.board[row][col];
        return piece && piece.color === this.currentPlayer;
    }

    selectPiece(row, col) {
        this.selectedPiece = { row, col };
        this.validMoves = this.getValidMoves(row, col);
        this.highlightValidMoves();
        this.highlightSelectedPiece();
    }

    getValidMoves(row, col) {
        const moves = [];
        const piece = this.board[row][col];
        const directions = piece.isKing ? 
            [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
            piece.color === 'red' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isValidPosition(newRow, newCol)) {
                if (!this.board[newRow][newCol]) {
                    moves.push({ row: newRow, col: newCol, isJump: false });
                } else if (this.board[newRow][newCol].color !== piece.color) {
                    const jumpRow = newRow + dr;
                    const jumpCol = newCol + dc;
                    if (this.isValidPosition(jumpRow, jumpCol) && !this.board[jumpRow][jumpCol]) {
                        moves.push({ row: jumpRow, col: jumpCol, isJump: true, captured: { row: newRow, col: newCol } });
                    }
                }
            }
        }

        return moves;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    isValidMove(row, col) {
        return this.validMoves.some(move => move.row === row && move.col === col);
    }

    makeMove(row, col) {
        if (this.singlePlayer) {
            if (this.currentPlayer !== this.humanColor) return;
            const move = this.validMoves.find(m => m.row === row && m.col === col);
            if (!move) return;
            const piece = this.board[this.selectedPiece.row][this.selectedPiece.col];
            this.board[row][col] = piece;
            this.board[this.selectedPiece.row][this.selectedPiece.col] = null;
            if (move.isJump) {
                this.board[move.captured.row][move.captured.col] = null;
            }
            if ((row === 0 && piece.color === 'red') || (row === 7 && piece.color === 'black')) {
                piece.isKing = true;
            }
            this.updateBoard();
            this.clearSelection();
            if (this.checkWin()) {
                alert(`${this.currentPlayer} wins!`);
                this.resetGame();
                return;
            }
            this.currentPlayer = this.computerColor;
            this.updateCurrentPlayer();
            setTimeout(() => this.computerMove(), 500);
            return;
        }
        if (!this.opponentConnected) {
            alert('Waiting for opponent to join...');
            return;
        }
        if (this.currentPlayer !== this.playerColor) {
            alert('Not your turn!');
            return;
        }
        const move = this.validMoves.find(m => m.row === row && m.col === col);
        if (!move) return;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'move',
                gameId: this.gameId,
                color: this.playerColor,
                move: {
                    from: {
                        row: this.selectedPiece.row,
                        col: this.selectedPiece.col
                    },
                    to: {
                        row: row,
                        col: col
                    }
                }
            }));
        }
        const piece = this.board[this.selectedPiece.row][this.selectedPiece.col];
        this.board[row][col] = piece;
        this.board[this.selectedPiece.row][this.selectedPiece.col] = null;
        if (move.isJump) {
            this.board[move.captured.row][move.captured.col] = null;
        }
        if ((row === 0 && piece.color === 'red') || (row === 7 && piece.color === 'black')) {
            piece.isKing = true;
        }
        this.updateBoard();
        this.clearSelection();
        if (this.checkWin()) {
            alert(`${this.currentPlayer} wins!`);
            this.resetGame();
            return;
        }
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        this.updateCurrentPlayer();
    }

    computerMove() {
        let allMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.computerColor) {
                    const moves = this.getValidMoves(row, col);
                    moves.forEach(move => {
                        allMoves.push({ from: { row, col }, to: move });
                    });
                }
            }
        }
        if (allMoves.length === 0) {
            alert('You win!');
            this.resetGame();
            return;
        }
        let move;
        if (this.difficulty === 'easy') {
            // Random move, prefer jumps
            const jumpMoves = allMoves.filter(m => m.to.isJump);
            move = (jumpMoves.length > 0 ? jumpMoves : allMoves)[Math.floor(Math.random() * (jumpMoves.length > 0 ? jumpMoves.length : allMoves.length))];
        } else if (this.difficulty === 'medium') {
            // Prefer jumps, otherwise prefer moves that advance pieces
            const jumpMoves = allMoves.filter(m => m.to.isJump);
            if (jumpMoves.length > 0) {
                move = jumpMoves[Math.floor(Math.random() * jumpMoves.length)];
            } else {
                // Prefer moves that move forward
                const forwardMoves = allMoves.filter(m => m.to.row > m.from.row);
                move = (forwardMoves.length > 0 ? forwardMoves : allMoves)[Math.floor(Math.random() * (forwardMoves.length > 0 ? forwardMoves.length : allMoves.length))];
            }
        } else if (this.difficulty === 'hard') {
            // Prefer jumps, otherwise block opponent jumps or move safest piece
            const jumpMoves = allMoves.filter(m => m.to.isJump);
            if (jumpMoves.length > 0) {
                move = jumpMoves[Math.floor(Math.random() * jumpMoves.length)];
            } else {
                // Try to block opponent jumps
                let safestMoves = allMoves.filter(m => !this.isThreatened(m.to.row, m.to.col, 'red'));
                if (safestMoves.length === 0) safestMoves = allMoves;
                move = safestMoves[Math.floor(Math.random() * safestMoves.length)];
            }
        }
        // Execute the move
        const piece = this.board[move.from.row][move.from.col];
        this.board[move.to.row][move.to.col] = piece;
        this.board[move.from.row][move.from.col] = null;
        if (move.to.isJump) {
            this.board[move.to.captured.row][move.to.captured.col] = null;
        }
        if ((move.to.row === 0 && piece.color === 'red') || (move.to.row === 7 && piece.color === 'black')) {
            piece.isKing = true;
        }
        this.updateBoard();
        this.clearSelection();
        if (this.checkWin()) {
            alert('Computer wins!');
            this.resetGame();
            return;
        }
        this.currentPlayer = this.humanColor;
        this.updateCurrentPlayer();
    }

    isThreatened(row, col, opponentColor) {
        // Check if a piece at (row, col) can be captured by opponent
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dr, dc] of directions) {
            const oppRow = row + dr;
            const oppCol = col + dc;
            const jumpRow = row - dr;
            const jumpCol = col - dc;
            if (this.isValidPosition(oppRow, oppCol) && this.isValidPosition(jumpRow, jumpCol)) {
                const oppPiece = this.board[oppRow][oppCol];
                if (oppPiece && oppPiece.color === opponentColor) {
                    if (!this.board[jumpRow][jumpCol]) {
                        // Opponent can jump to (row, col)
                        return true;
                    }
                }
            }
        }
        return false;
    }

    checkWin() {
        const pieces = this.board.flat();
        const redPieces = pieces.filter(p => p && p.color === 'red');
        const blackPieces = pieces.filter(p => p && p.color === 'black');
        return redPieces.length === 0 || blackPieces.length === 0;
    }

    highlightValidMoves() {
        this.validMoves.forEach(move => {
            const square = document.querySelector(`.square[data-row="${move.row}"][data-col="${move.col}"]`);
            square.classList.add('valid-move');
        });
    }

    highlightSelectedPiece() {
        const square = document.querySelector(`.square[data-row="${this.selectedPiece.row}"][data-col="${this.selectedPiece.col}"]`);
        square.querySelector('.piece').classList.add('selected');
    }

    clearSelection() {
        document.querySelectorAll('.valid-move').forEach(el => el.classList.remove('valid-move'));
        document.querySelectorAll('.piece.selected').forEach(el => el.classList.remove('selected'));
        this.selectedPiece = null;
        this.validMoves = [];
    }

    updateBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.color}${piece.isKing ? ' king' : ''}`;
                    square.appendChild(pieceElement);
                }

                boardElement.appendChild(square);
            }
        }
    }

    updateCurrentPlayer() {
        document.getElementById('current-player').textContent = `Current Player: ${this.currentPlayer === 'red' ? 'Red' : 'Black'}`;
    }

    resetGame() {
        if (this.singlePlayer) {
            this.board = [];
            this.currentPlayer = 'red';
            this.selectedPiece = null;
            this.validMoves = [];
            this.initializeBoard();
            this.updateCurrentPlayer();
            document.getElementById('game-status').textContent = 'Playing vs Computer';
            document.querySelector('.multiplayer-controls').style.display = 'none';
            document.querySelector('.chat-container').style.display = 'none';
            return;
        }
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'resetGame',
                gameId: this.gameId
            }));
        }
        this.board = [];
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.validMoves = [];
        this.initializeBoard();
        this.updateCurrentPlayer();
    }

    createGame() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'createGame'
            }));
        }
    }

    joinGame() {
        const gameId = document.getElementById('game-id').value;
        if (gameId && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'joinGame',
                gameId: gameId
            }));
        }
    }

    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (message && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'chat',
                gameId: this.gameId,
                message: message,
                sender: this.playerColor
            }));
            this.addChatMessage(message, this.playerColor);
            input.value = '';
        }
    }

    addChatMessage(message, sender) {
        const messagesDiv = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender === this.playerColor ? 'own' : 'opponent'}`;
        messageDiv.textContent = message;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    startSinglePlayer() {
        this.singlePlayer = true;
        this.humanColor = 'red';
        this.computerColor = 'black';
        this.playerColor = 'red';
        this.currentPlayer = 'red';
        this.board = [];
        this.selectedPiece = null;
        this.validMoves = [];
        this.opponentConnected = false;
        this.gameId = null;
        this.ws = null;
        this.difficulty = document.getElementById('difficulty').value;
        this.initializeBoard();
        this.updateCurrentPlayer();
        document.getElementById('game-status').textContent = 'Playing vs Computer';
        document.querySelector('.multiplayer-controls').style.display = 'none';
        document.querySelector('.chat-container').style.display = 'none';
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new CheckersGame();
}); 