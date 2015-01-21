'use strict';

function Handshake() {
  BaseState.apply(this, arguments);
}

Handshake.prototype = Object.create(BaseState.prototype);

Handshake.prototype.handleMessage = function (msg) {
};
