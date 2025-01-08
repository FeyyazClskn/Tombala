const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const lobbies = {};

// Statik dosyaları ayarla
app.use(express.static(path.join(__dirname, 'public')));

// Ana sayfayı yönlendir
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tmbl1game.html'));
});

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Lobiye katılma
    socket.on('joinLobby', ({ lobby, playerName }) => {
        if (!lobbies[lobby]) {
            lobbies[lobby] = { players: [], numbers: [] };
        }

        const lobbyData = lobbies[lobby];

        if (lobbyData.players.length < 2) {
            const player = {
                id: socket.id,
                name: playerName,
                card: generateCard(),
            };
            lobbyData.players.push(player);

            socket.join(lobby);

            // Lobiye yeni oyuncu bilgisi gönder
            io.to(lobby).emit('updatePlayers', lobbyData.players);

            // Oyuncu için oturum bilgisi
            socket.emit('sessionData', {
                lobby,
                playerName,
                card: player.card,
            });
        } else {
            socket.emit('lobbyFull');
        }
    });

    // Sayı çekme
    socket.on('drawNumber', ({ lobby }) => {
        const lobbyData = lobbies[lobby];
        if (!lobbyData) return;

        const remainingNumbers = Array.from({ length: 90 }, (_, i) => i + 1).filter(
            (num) => !lobbyData.numbers.includes(num)
        );

        if (remainingNumbers.length === 0) {
            io.to(lobby).emit('noMoreNumbers');
            return;
        }

        const randomIndex = Math.floor(Math.random() * remainingNumbers.length);
        const drawnNumber = remainingNumbers[randomIndex];
        lobbyData.numbers.push(drawnNumber);

        // Çekilen sayıyı lobiye gönder
        io.to(lobby).emit('newNumber', { number: drawnNumber });
    });

    // Mesaj gönderme
    socket.on('sendMessage', ({ lobby, message }) => {
        const lobbyData = lobbies[lobby];
        if (!lobbyData) return;

        const player = lobbyData.players.find((p) => p.id === socket.id);
        if (!player) return;

        io.to(lobby).emit('newMessage', {
            playerName: player.name,
            message,
        });
    });

    // Oyun bitişi
    socket.on('gameOver', ({ lobby, winner }) => {
        io.to(lobby).emit('gameOver', { winner });
        if (lobbies[lobby]) {
            delete lobbies[lobby]; // Lobi temizliği
        }
    });

    // Kullanıcı bağlantıyı keserse
    socket.on('disconnect', () => {
        console.log('Bir kullanıcı ayrıldı:', socket.id);

        for (const lobby in lobbies) {
            const lobbyData = lobbies[lobby];
            const playerIndex = lobbyData.players.findIndex((p) => p.id === socket.id);

            if (playerIndex !== -1) {
                lobbyData.players.splice(playerIndex, 1);
                io.to(lobby).emit('updatePlayers', lobbyData.players);

                if (lobbyData.players.length === 0) {
                    delete lobbies[lobby]; // Boş lobi temizliği
                }

                break;
            }
        }
    });
});

// Kart oluşturma fonksiyonu
function generateCard() {
    const numbers = Array.from({ length: 90 }, (_, i) => i + 1);
    const card = [];

    for (let i = 0; i < 15; i++) {
        const randomIndex = Math.floor(Math.random() * numbers.length);
        card.push(numbers[randomIndex]);
        numbers.splice(randomIndex, 1);
    }

    return card;
}

// Sunucuyu başlat
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} numaralı portta çalışıyor.`);
});
