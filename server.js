const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const lobbies = {}; // Stores lobby data

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('createLobby', ({ lobbyName }) => {
        if (!lobbies[lobbyName]) {
            lobbies[lobbyName] = { players: [] };
            console.log(`Lobby ${lobbyName} created.`);
        }
    });

socket.on('joinLobby', ({ lobby, playerName }) => {
    if (lobbies[lobby].players.length < 2) {
        lobbies[lobby].players.push({ id: socket.id, name: playerName });
        socket.join(lobby);
        console.log(`${playerName} joined lobby ${lobby}.`);

        // Oyuncu bilgilerini lobideki tüm kullanıcılara gönder
        io.to(lobby).emit('updatePlayers', lobbies[lobby].players);

        // Eğer lobi dolduysa oyun başlat
        if (lobbies[lobby].players.length === 2) {
            io.to(lobby).emit('allPlayersReady');
        }
    } else {
        socket.emit('lobbyFull');
    }
});


    socket.on('selectCard', ({ lobby, card }) => {
        const player = lobbies[lobby].players.find(p => p.id === socket.id);
        if (player) player.card = card;

        const allPlayersReady = lobbies[lobby].players.every(p => p.card);
        if (allPlayersReady) {
            io.to(lobby).emit('allPlayersReady');
        }
    });

    socket.on('sendMessage', ({ lobby, message }) => {
        const playerName = lobbies[lobby].players.find(p => p.id === socket.id).name;
        io.to(lobby).emit('newMessage', { playerName, message });
    });

socket.on('startGame', (lobby) => {
    io.to(lobby).emit('startGame', { cards: lobbies[lobby].players });
});


    socket.on('disconnect', () => {
        for (const lobby in lobbies) {
            lobbies[lobby].players = lobbies[lobby].players.filter(p => p.id !== socket.id);
            io.to(lobby).emit('updatePlayers', lobbies[lobby].players);
        }
        console.log('A user disconnected:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});
