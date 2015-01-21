'use strict';

/* global EventEmitter, Promise */

function LaserTag(config) {
  this.host = config.host;
  this.port = config.port;
  this.states = config.states;
  this.state = this.states[0];
  this.initialized = false;
  EventEmitter.call(this);
}

LaserTag.prototype = Object.create(EventEmitter);

LaserTag.prototype.setStates = function (states) {
  if (arguments.length > 1) {
    this.states = [];
    for (var i = 0; i < arguments.length; i += 1) {
      this.states.push(arguments[i]);
    }
  } else {
    this.states = states;
  }
  this.state = states[0];
};

LaserTag.prototype.connect = function () {
  this.socket = new WebSocket('ws://localhost:8081');
  var deferred = Promise.defer();
  this.socket.onopen = this.initiateHandshake.bind(this);
  this.socket.onmessage = this.handleMessage.bind(this);
  return deferred.promise;
};

LaserTag.prototype.handleMessage = function (msg) {
  if (!this.initialized) {
    try {
      msg = JSON.parse(msg);
      if (msg.type === 'handshake' && msg.status === 'success') {
        this.emit('handshake-success');
      } else {
        this.emit('handshake-error');
      }
      this.initialized = true;
    } catch (e) {
      console.error('Error while parsing');
    }
  }
  var reader = new FileReader();
  reader.onload = function (e) {
    this.state.handleMessage(e.target.result);
  }.bind(this);
  reader.readAsText(msg);
};

LaserTag.prototype.initiateHandshake = function () {
  this.socket.send({
    host: this.host,
    port: this.port
  });
};

LaserTag.prototype.send = function (msg) {
  this.socket.send(msg);
};
