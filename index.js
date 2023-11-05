const express = require('express')
const { createServer } = require('node:http')
const { Server } = require('socket.io')
const { v4: uuid } = require('uuid')
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173"
    }
})
const playerOne = [
    { id: 1, number: 1 },
    { id: 2, number: 3 },
    { id: 3, number: 5 },
    { id: 4, number: 7 },
    { id: 5, number: 9 },
]

const playerTwo = [
    { id: 1, number: 2 },
    { id: 2, number: 4 },
    { id: 3, number: 6 },
    { id: 4, number: 8 },
]
const players = {
    'player1': playerOne,
    'player2': playerTwo
}
let playersInGames = {}

let persistentGrids = {}

let playerSockets = {}

let gamesFinished = {}

let whoIsPlaying = {}

io.on('connection', (socket) => {
    console.log("a user connected")
    socket.on('join-room', ({ room }) => {

        socket.join(room)
        // Lets a user know if they can join
        if (io.sockets.adapter.rooms.get(room).size > 2) {
            socket.leave(room)
            socket.emit('filled-game')
            return
        }
        // This helps to identify player1 from player2
        // in order to share different cards to each
        if (playersInGames[room]) {
            playersInGames[room]++
        } else {
            playersInGames[room] = 1
        }

        const id = uuid()
        if (playerSockets[room]) {
            playerSockets[room].push(socket)
        } else {
            playerSockets[room] = [socket]
        }

        if (!gamesFinished[room]) {
            gamesFinished[room] = false
        }
        console.log("Players sockets", playerSockets);
        socket.emit('send-id', socket.id)
        // If player1 plays before player2 joins the game,
        // player2 will still see the played card
        if (persistentGrids[room]) {
            socket.emit('update-all-players', persistentGrids[room])
        }


        const playerCount = playersInGames[room]
        console.log("Player", players[`player${playerCount}`], playersInGames);
        socket.emit('share-cards', players[`player${playerCount}`])
        const firstPlayer = playerSockets[room][0]
        firstPlayer.broadcast.emit('disable')
        socket.on('played', (playerId) => {
            console.log("I have played", playerId)
            const current = playerSockets[room].find(socket => socket.id === playerId)
            current.emit('disable')
            const next = playerSockets[room].filter(socket => socket.id !== playerId)[0]
            next.emit('enable')
            console.log("Next to play", next);

        })
        socket.on('update-grid', (newGrid) => {
            persistentGrids[room] = newGrid
            io.to(room).emit('update-all-players', newGrid)
            // console.log("Persistent Grid", persistentGrids);
            console.log("Update grid");
        })

        socket.on('reduce-count', () => {
            playersInGames[room]--;
        })
        socket.on('disconnect', (reason) => {
            playersInGames[room]--
            console.log("Reason ", reason);
            console.log("Left ", room, playerCount);
            playerSockets[room] = playerSockets[room].filter(playerSocket => playerSocket.id !== socket.id)
            socket.leave(room)
            if (playerSockets[room].length === 1) {
                console.log("Left", playerSockets[room]);
                const winnerByForfeit = playerSockets[room][0]
                winnerByForfeit.emit("winner")
            }

        })
    })
})


server.listen(3000, () => {
    console.log(`Server is running at http://localhost:3000`)
})
