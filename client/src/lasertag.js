'use strict';

/* global EventEmitter, Promise */

function LaserTag(config) {
  this.host = config.host;
  this.port = config.port;
  this.states = config.states;
  this.state = (this.states || [])[0];
  this.initialized = false;
  EventEmitter.call(this);
}

LaserTag.prototype = Object.create(EventEmitter.prototype);

LaserTag.prototype.setStates = function (states) {
  if (arguments.length > 1) {
    this.states = [];
    for (var i = 0; i < arguments.length; i += 1) {
      this.states.push(arguments[i]);
    }
  } else {
    this.states = states;
  }
  this.state = this.states[0];
};

LaserTag.prototype.connect = function () {
  this.socket = new WebSocket('ws://localhost:8081');
  var deferred = Promise.defer();
  this.socket.onopen = this.initiateHandshake.bind(this, deferred);
  this.socket.onmessage = this.handleMessage.bind(this);
  return deferred.promise;
};

LaserTag.prototype.handleMessage = function (msg) {
  if (!this.initialized) {
    try {
      msg = JSON.parse(msg.data);
      if (msg.type === 'handshake' && msg.status === 'success') {
        this.emit('handshake-success');
      } else {
        this.emit('handshake-error');
      }
      this.initialized = true;
    } catch (e) {
      console.error('Error while parsing');
    }
  } else {
    this.state.readMessage(msg.data)
      .then(function (msg) {
        this.state.handleMessage(msg);
      }.bind(this));
  }
};

LaserTag.prototype.initiateHandshake = function (deferred) {
  this.socket.send(JSON.stringify({
    host: this.host,
    port: this.port,
    type: 'handshake'
  }));
  deferred.resolve();
};

LaserTag.prototype.send = function (msg) {
  this.socket.send(msg);
};
