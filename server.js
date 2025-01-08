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
const lobbies = {}; // { lobbyName: { players: [], cards: {} } }

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Oyuncu bir lobiye katılıyor
    socket.on('joinLobby', ({ lobby, playerName }) => {
        if (!lobbies[lobby]) {
            lobbies[lobby] = { players: [], cards: {} };
        }

        // Lobide oyuncuyu ekle
        lobbies[lobby].players.push({ id: socket.id, name: playerName });
        socket.join(lobby);

        // Güncellenmiş oyuncu bilgilerini gönder
        io.to(lobby).emit('updatePlayers', lobbies[lobby].players);
    });

    // Kart seçimi
    socket.on('selectCard', ({ lobby, card }) => {
        if (!lobbies[lobby]) return;

        lobbies[lobby].cards[socket.id] = card;

        // Oyuncu kart seçimini tamamladı mesajı
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

    socket.on('drawNumber', ({ lobby }) => {
    if (!lobbies[lobby]) return;

    const drawnNumbers = lobbies[lobby].drawnNumbers || [];
    let newNumber;

    do {
        newNumber = Math.floor(Math.random() * 90) + 1; // 1 ile 90 arasında rastgele bir sayı
    } while (drawnNumbers.includes(newNumber));

    drawnNumbers.push(newNumber);
    lobbies[lobby].drawnNumbers = drawnNumbers;

    io.to(lobby).emit('newNumber', { number: newNumber });
});


    // Oyuncu ayrıldığında
    socket.on('disconnect', () => {
        console.log('Bir kullanıcı ayrıldı:', socket.id);

        for (const lobby in lobbies) {
            const playerIndex = lobbies[lobby].players.findIndex(p => p.id === socket.id);

            if (playerIndex !== -1) {
                lobbies[lobby].players.splice(playerIndex, 1);
                delete lobbies[lobby].cards[socket.id];

                // Lobideki oyuncuları güncelle
                io.to(lobby).emit('updatePlayers', lobbies[lobby].players);

                // Eğer lobi boşsa, lobiyi sil
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
