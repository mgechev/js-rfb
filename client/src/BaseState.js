'use strict';

/* global Promise */
/* jshint unused: false */

var MESSAGE_TYPES = {
  ARRAY_BUFFER: 'ArrayBuffer',
  BINARY_STRING: 'BinaryString',
  DATA_URL: 'DataURL',
  TEXT: 'Text'
};

function BaseState(bridge, msgType) {
  this.bridge = bridge;
  this.messageType = msgType;
}

BaseState.prototype.setMessageType = function (type) {
  this.messageType = type;
};

BaseState.prototype.readMessage = function (msg) {
  var reader = new FileReader();
  var deferred = Promise.defer();
  reader.addEventListener('loadend', function (e) {
    deferred.resolve(e.target.result);
  }, false);
  reader['readAs' + this.messageType](msg);
  return deferred.promise;
};

BaseState.prototype.handleMessage = function (msg) {
  throw new Error('Not implemented');
};

BaseState.prototype.send = function (data) {
  this.bridge.send(data);
};
