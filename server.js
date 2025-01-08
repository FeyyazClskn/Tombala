const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Lobi yönetimi
const lobbies = {}; // { lobbyName: { players: [], cards: {}, drawnNumbers: [] } }

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    socket.on('joinLobby', ({ lobby, playerName }) => {
        if (!lobbies[lobby]) {
            lobbies[lobby] = { players: [], cards: {}, drawnNumbers: [] };
        }

        lobbies[lobby].players.push({ id: socket.id, name: playerName });
        socket.join(lobby);

        io.to(lobby).emit('updatePlayers', lobbies[lobby].players);
    });

    socket.on('selectCard', ({ lobby, card }) => {
        if (!lobbies[lobby]) return;

        lobbies[lobby].cards[socket.id] = card;

        const player = lobbies[lobby].players.find(p => p.id === socket.id);
        if (player) {
            io.to(lobby).emit('playerSelectedCard', { playerName: player.name });
        }

        if (Object.keys(lobbies[lobby].cards).length === lobbies[lobby].players.length) {
            const players = lobbies[lobby].players.map(p => ({
                id: p.id,
                name: p.name,
                card: lobbies[lobby].cards[p.id]
            }));
            io.to(lobby).emit('startGame', { players });
        }
    });

    socket.on('drawNumber', ({ lobby }) => {
        if (!lobbies[lobby]) return;

        let newNumber;
        do {
            newNumber = Math.floor(Math.random() * 90) + 1;
        } while (lobbies[lobby].drawnNumbers.includes(newNumber));

        lobbies[lobby].drawnNumbers.push(newNumber);
        io.to(lobby).emit('newNumber', { number: newNumber });
    });

    socket.on('sendMessage', ({ lobby, message }) => {
        if (!lobbies[lobby]) return;

        const player = lobbies[lobby].players.find(p => p.id === socket.id);
        if (player) {
            io.to(lobby).emit('newMessage', { playerName: player.name, message });
        }
    });

    socket.on('gameOver', ({ lobby, winner }) => {
        if (!lobbies[lobby]) return;

        io.to(lobby).emit('gameOver', { winner });
        delete lobbies[lobby];
    });

    socket.on('disconnect', () => {
        console.log('Bir kullanıcı ayrıldı:', socket.id);

        for (const lobby in lobbies) {
            const playerIndex = lobbies[lobby].players.findIndex(p => p.id === socket.id);

            if (playerIndex !== -1) {
                lobbies[lobby].players.splice(playerIndex, 1);
                delete lobbies[lobby].cards[socket.id];

                io.to(lobby).emit('updatePlayers', lobbies[lobby].players);

                if (lobbies[lobby].players.length === 0) {
                    delete lobbies[lobby];
                }
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
