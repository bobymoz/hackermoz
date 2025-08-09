// server.js (para Render)
const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let users = {};
let waitingUser = null;

console.log('Servidor de sinalização pronto para iniciar...');

wss.on('connection', ws => {
    const userId = Math.random().toString(36).substr(2, 9);
    users[userId] = ws;
    console.log(`Usuário conectado: ${userId}`);

    ws.on('message', message => {
        let data;
        try { data = JSON.parse(message); } catch (e) { return; }

        if (ws.partner && users[ws.partner]) {
            users[ws.partner].send(JSON.stringify(data));
        }

        if (data.type === 'join') {
            if (waitingUser && users[waitingUser]) {
                const partnerId = waitingUser;
                waitingUser = null;
                ws.partner = partnerId;
                users[partnerId].partner = userId;
                ws.send(JSON.stringify({ type: 'paired' }));
                users[partnerId].send(JSON.stringify({ type: 'paired' }));
                console.log(`Usuários pareados: ${userId} e ${partnerId}`);
            } else {
                waitingUser = userId;
                ws.send(JSON.stringify({ type: 'waiting' }));
                console.log(`Usuário ${userId} está esperando.`);
            }
        }
    });

    ws.on('close', () => {
        console.log(`Usuário desconectado: ${userId}`);
        const partnerId = ws.partner;
        if (partnerId && users[partnerId]) {
            users[partnerId].send(JSON.stringify({ type: 'user-left' }));
            users[partnerId].partner = null;
        }
        if (waitingUser === userId) { waitingUser = null; }
        delete users[userId];
    });
});

app.get('/', (req, res) => {
  res.send('Servidor de Sinalização está funcionando perfeitamente!');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Servidor escutando na porta ${port}`);
});
