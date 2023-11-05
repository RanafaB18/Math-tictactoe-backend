const express = require('express')
const { createServer } = require('node:http')
const { Server } = require('socket.io')
const cors = require('cors')
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        // origin: "http://localhost:5173"
        origin: "*"
    }
})
app.use(express.json())

app.use(cors())
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

        if (playerSockets[room]) {
            playerSockets[room].push(socket)
        } else {
            playerSockets[room] = [socket]
        }

        if (playerSockets[room].length === 2) {
            io.to(room).emit('ready')
        }
        console.log("Player socket", playerSockets)

        if (!gamesFinished[room]) {
            gamesFinished[room] = false
        }
        socket.emit('send-id', socket.id)
        // If player1 plays before player2 joins the game,
        // player2 will still see the played card
        if (persistentGrids[room]) {
            socket.emit('update-all-players', persistentGrids[room])
        }


        const playerCount = playersInGames[room]
        socket.emit('share-cards', players[`player${playerCount}`])
        const firstPlayer = playerSockets[room][0]
        firstPlayer.broadcast.emit('disable')
        socket.on('played', (playerId) => {
            const current = playerSockets[room].find(socket => socket.id === playerId)
            current.emit('disable')
            const next = playerSockets[room].filter(socket => socket.id !== playerId)[0]
            next.emit('enable')
        })
        socket.on('update-grid', (newGrid) => {
            persistentGrids[room] = newGrid
            io.to(room).emit('update-all-players', newGrid)
            if (checkIfGameIsOver(newGrid)) {
                socket.broadcast.emit('lost')
                socket.emit('won')
            }
        })

        socket.on('reduce-count', () => {
            playersInGames[room]--;
        })
        socket.on('disconnect', (reason) => {
            playersInGames[room]--
            playerSockets[room] = playerSockets[room].filter(playerSocket => playerSocket.id !== socket.id)
            socket.leave(room)
            if (playerSockets[room].length === 1) {
                const winnerByForfeit = playerSockets[room][0]
                winnerByForfeit.emit("winner")
            }

        })
    })
})

function checkIfGameIsOver(grid) {
    // Verticals
    if ((Number(grid[0].number) + Number(grid[3].number) + Number(grid[6].number)) === 15) {
        return true
    }
    if ((Number(grid[1].number) + Number(grid[4].number) + Number(grid[7].number)) === 15) {
        return true
    }
    if ((Number(grid[2].number) + Number(grid[5].number) + Number(grid[8].number)) === 15) {
        return true
    }

    // Horizontals
    if ((Number(grid[0].number) + Number(grid[1].number) + Number(grid[2].number)) === 15) {
        return true
    }
    if ((Number(grid[3].number) + Number(grid[4].number) + Number(grid[5].number)) === 15) {
        return true
    }
    if ((Number(grid[6].number) + Number(grid[7].number) + Number(grid[8].number)) === 15) {
        return true
    }

    //Diagonals

    if ((Number(grid[0].number) + Number(grid[4].number) + Number(grid[8].number)) === 15) {
        return true
    }

    if ((Number(grid[2].number) + Number(grid[4].number) + Number(grid[6].number)) === 15) {
        return true
    }


  }
server.listen(3000, () => {
    console.log(`Server is running`)
})
