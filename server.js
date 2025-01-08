const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const lobbies = {}; // Lobi bilgilerini saklar

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    socket.on('joinLobby', ({ lobby, playerName }) => {
        if (!lobbies[lobby]) {
            lobbies[lobby] = { players: [], numbers: [], isGameStarted: false };
        }

        const lobbyData = lobbies[lobby];

        if (lobbyData.players.length < 2) {
            const player = { id: socket.id, name: playerName, card: null };
            lobbyData.players.push(player);
            socket.join(lobby);

            io.to(lobby).emit('updatePlayers', lobbyData.players);

            if (lobbyData.players.length === 2) {
                io.to(lobby).emit('lobbyReady');
            }
        } else {
            socket.emit('lobbyFull');
        }
    });

    socket.on('selectCard', ({ lobby, card }) => {
        const player = lobbies[lobby]?.players.find(p => p.id === socket.id);
        if (player) {
            player.card = card;
            socket.to(lobby).emit('playerSelectedCard', { playerName: player.name });
        }

        const allPlayersReady = lobbies[lobby]?.players.every(p => p.card);
        if (allPlayersReady) {
            io.to(lobby).emit('startGame', { players: lobbies[lobby].players });
            lobbies[lobby].isGameStarted = true;
        }
    });

    socket.on('drawNumber', ({ lobby }) => {
        const lobbyData = lobbies[lobby];
        if (!lobbyData) return;

        const remainingNumbers = Array.from({ length: 90 }, (_, i) => i + 1).filter(
            (num) => !lobbyData.numbers.includes(num)
        );

        const randomIndex = Math.floor(Math.random() * remainingNumbers.length);
        const drawnNumber = remainingNumbers[randomIndex];
        lobbyData.numbers.push(drawnNumber);

        io.to(lobby).emit('newNumber', { number: drawnNumber });
    });

    socket.on('sendMessage', ({ lobby, message, playerName }) => {
        io.to(lobby).emit('newMessage', { playerName, message });
    });

    socket.on('gameOver', ({ lobby, winner }) => {
        io.to(lobby).emit('gameOver', { winner });
    });

    socket.on('disconnect', () => {
        for (const lobby in lobbies) {
            const lobbyData = lobbies[lobby];
            if (lobbyData) {
                lobbyData.players = lobbyData.players.filter((p) => p.id !== socket.id);
                io.to(lobby).emit('updatePlayers', lobbyData.players);
            }
        }
        console.log('Bir kullanıcı ayrıldı:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Sunucu 3000 numaralı portta çalışıyor.');
});
