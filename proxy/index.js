'use strict';

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 8081 });
var net = require('net');

wss.on('connection', function (ws) {
  var client;
  ws.on('message', function (msg) {
    console.log('Message received');
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
        ws.send(JSON.stringify({
          type: 'handshake',
          status: 'success'
        }));
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
  ws.on('close', function () {
    if (client) {
      client.end();
    }
  });
});

console.log('Listening on', 8081);
