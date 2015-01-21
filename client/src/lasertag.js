'use strict';

/* global EventEmitter, Promise */

function LaserTag(config) {
  this.host = config.host;
  this.port = config.port;
  this.state = config.initialState;
  this.states = config.states;
  this.initialized = false;
  EventEmitter.call(this);
}

LaserTag.prototype = Object.create(EventEmitter);

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
