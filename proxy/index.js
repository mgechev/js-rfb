'use strict';

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 8081 });
var net = require('net');

wss.on('connection', function (ws) {
  var client;
  ws.on('message', function (msg) {
    msg = JSON.parse(msg);
    if (msg.type === 'handshake') {
      client = net.connect(msg.host, msg.port, function () {
        console.log('Connected');
      });
      client.on('data', function (data) {
        console.log('data');
        ws.send(data, { binary: true });
      });
      client.on('end', function () {
        console.log('end');
      });
    } else {
      client.send(msg);
    }
  });
});

console.log('Listening on', 8081);
