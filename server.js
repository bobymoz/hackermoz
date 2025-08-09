
// /server.js (vFinal - Anonymous & Moderation)
const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let users = {};
let waitingUser = null;

// Função para enviar a contagem de usuários online
const broadcastUserCount = () => {
    const count = Object.keys(users).length;
    const message = JSON.stringify({ type: 'count', count: count });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

wss.on('connection', (ws, req) => {
    const userId = Math.random().toString(36).substr(2, 9);
    ws.id = userId;
    users[userId] = ws;

    // Obtém o IP para um futuro sistema de banimento
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`Usuário conectado: ${userId} de ${ip}, Total: ${Object.keys(users).length}`);
    broadcastUserCount();

    ws.on('message', message => {
        let data;
        try { data = JSON.parse(message); } catch (e) { return; }

        const partnerSocket = (ws.partner && users[ws.partner]) ? users[ws.partner] : null;

        switch(data.type) {
            case 'join':
                if (waitingUser && users[waitingUser] && waitingUser !== userId) {
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
                }
                break;
            
            case 'report':
                if (partnerSocket) {
                    const reportedUserId = ws.partner;
                    console.log(`!!! DENÚNCIA RECEBIDA !!! Do usuário ${userId} contra o usuário ${reportedUserId}.`);
                    // Aqui você pode salvar o 'data.snapshot' em um arquivo ou banco de dados.
                    // Ex: fs.writeFileSync(`reports/${Date.now()}_${reportedUserId}.jpg`, Buffer.from(data.snapshot.split(',')[1], 'base64'));
                    // Por enquanto, apenas registramos no console.
                }
                break;

            // Encaminha ofertas, respostas e candidatos para o parceiro
            case 'offer':
            case 'answer':
            case 'candidate':
                if (partnerSocket) {
                    partnerSocket.send(JSON.stringify(data));
                }
                break;
        }
    });

    ws.on('close', () => {
        console.log(`Usuário desconectado: ${userId}`);
        const partnerId = ws.partner;
        if (partnerId && users[partnerId]) {
            users[partnerId].send(JSON.stringify({ type: 'user-left' }));
            users[partnerId].partner = null;
        }
        if (waitingUser === userId) {
            waitingUser = null;
        }
        delete users[userId];
        broadcastUserCount();
    });
});

app.get('/', (req, res) => res.send('Servidor de Sinalização Voxia está funcionando!'));
server.listen(process.env.PORT || 3000, () => console.log('Servidor escutando...'));
