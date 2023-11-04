const express = require('express')
const { createServer } = require('node:http')

const app = express();
const server = createServer(app);

server.listen(3000, () => {
    console.log(`Server is runnung at http://localhost:3000`)
})
