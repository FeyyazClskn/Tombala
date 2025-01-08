const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

app.use(express.static('public'));

let lobbies = {
    tmbl1: { players: [], gameStarted: false },
    tmbl2: { players: [], gameStarted: false }
};

io.on('connection', (socket) => {
    console.log('Bir oyuncu bağlandı:', socket.id);

socket.on('joinLobby', ({ lobby, playerName }) => {
    if (lobbies[lobby].players.length < 2) {
        lobbies[lobby].players.push({ id: socket.id, name: playerName });
        socket.join(lobby);
        console.log(`${playerName} ${lobby} lobisine katıldı.`);
        io.to(lobby).emit('updatePlayers', lobbies[lobby].players);
    } else {
        socket.emit('lobbyFull');
    }
});


    socket.on('selectCard', ({ lobby, card }) => {
        socket.to(lobby).emit('cardSelected', { playerId: socket.id, card });
        const allPlayersSelected = lobbies[lobby].players.every(player => player.card);
        if (allPlayersSelected) {
            io.to(lobby).emit('startGame');
        }
    });

    socket.on('drawNumber', ({ lobby }) => {
        const number = Math.floor(Math.random() * 90) + 1;
        io.to(lobby).emit('numberDrawn', number);
    });

    socket.on('sendMessage', ({ lobby, message }) => {
        io.to(lobby).emit('newMessage', message);
    });

    socket.on('disconnect', () => {
        console.log('Bir oyuncu ayrıldı:', socket.id);
        for (let lobby in lobbies) {
            lobbies[lobby].players = lobbies[lobby].players.filter(player => player.id !== socket.id);
            io.to(lobby).emit('updatePlayers', lobbies[lobby].players);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
