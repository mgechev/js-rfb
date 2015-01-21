'use strict';

/* global BaseState, MESSAGE_TYPES */

function Handshake(bridge) {
  BaseState.call(this, bridge, MESSAGE_TYPES.BINARY_STRING);
}

Handshake.prototype = Object.create(BaseState.prototype);

Handshake.prototype.handleMessage = function (msg) {
  console.log(msg);
};
