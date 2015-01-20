'use strict';

var ws = new WebSocket('ws://localhost:8081');

ws.onopen = function () {
  console.log('Socket opened');
  ws.send(JSON.stringify({
    type: 'handshake',
    host: '192.168.0.118',
    port: 5900
  }));
};

ws.onmessage = function (msg) {
  console.log('Message', msg);
  var blob = msg.data;
  var reader = new FileReader();
  reader.onload = function (e) {
    console.log(e.target.result);
  };
  reader.readAsText(blob);
};
