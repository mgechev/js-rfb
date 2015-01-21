'use strict';

/* jshint unused: false */
function BaseState(bridge) {
  this.bridge = bridge;
}

BaseState.prototype.handleMessage = function (msg) {
  throw new Error('Not implemented');
};
