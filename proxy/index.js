'use strict';

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 8081 });
var net = require('net');

wss.on('connection', function (ws) {
  var client;
  ws.on('message', function (msg) {
    try {
      msg = JSON.parse(msg);
    } catch (e) {
      if (client) {
        client.write(msg);
      }
    }
    if (msg.type === 'handshake') {
      client = net.createConnection(msg.port, msg.host, function () {
        console.log('Connected');
        ws.send({
          type: 'handshake',
          status: 'success'
        });
      });
      client.on('data', function (data) {
        console.log('data');
        ws.send(data, { binary: true });
      });
      client.on('end', function () {
        console.log('end');
        ws.close();
      });
    }
  });
});

console.log('Listening on', 8081);
