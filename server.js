const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Sunucu ayarları
app.use(express.static('public'));

// Lobi yönetimi
const lobbies = {}; // { lobbyName: { players: [], cards: {}, drawnNumbers: [] } }

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Oyuncu bir lobiye katılıyor
    socket.on('joinLobby', ({ lobby, playerName }) => {
    console.log(`Sunucu: joinLobby olayı alındı. Lobi: ${lobby}, Oyuncu: ${playerName}`);

    if (!lobby || !playerName) {
        console.log('Sunucu: Eksik lobi veya oyuncu adı.');
        socket.emit('error', { message: 'Eksik lobi veya oyuncu adı.' });
        return;
    }

    if (!lobbies[lobby]) {
        console.log(`Sunucu: Yeni bir lobi oluşturuldu - ${lobby}`);
        lobbies[lobby] = { players: [], cards: {}, drawnNumbers: [] };
    }

    // Oyuncu zaten lobide mi?
    const isPlayerInLobby = lobbies[lobby].players.some(p => p.id === socket.id);
    if (!isPlayerInLobby) {
        lobbies[lobby].players.push({ id: socket.id, name: playerName }); // Doğru isim ekleniyor
    }

    socket.join(lobby);
    io.to(lobby).emit('updatePlayers', lobbies[lobby].players); // İstemciye oyuncuları gönder
});


    // Kart seçimi
    socket.on('selectCard', ({ lobby, card }) => {
        if (!lobbies[lobby]) return;

        lobbies[lobby].cards[socket.id] = card;
        const player = lobbies[lobby].players.find(p => p.id === socket.id);

        if (player) {
            io.to(lobby).emit('playerSelectedCard', { playerName: player.name });
        }

        // Tüm oyuncular kart seçti mi kontrol et
        if (Object.keys(lobbies[lobby].cards).length === lobbies[lobby].players.length) {
            const players = lobbies[lobby].players.map(p => ({
                id: p.id,
                name: p.name,
                card: lobbies[lobby].cards[p.id]
            }));

            io.to(lobby).emit('startGame', { players });
        }
    });

    // Oyuncu ayrıldığında
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
