'use strict';

/* global BaseState, MESSAGE_TYPES */

function Handshake(bridge) {
  BaseState.call(this, bridge, MESSAGE_TYPES.BINARY_STRING);
  this.version = null;
  this.supportedSecurity = {
    '2': true
  };
}

var SECURITY_TYPES = {
  '0': 'Invalid',
  '1': 'None',
  '2': 'VNC Authentication',
  '5': 'RA2',
  '6': 'RA2ne',
  '16': 'Tight',
  '17': 'Ultra',
  '18': 'TLS',
  '19': 'VeNCrypt',
  '20': 'GTK-VNC SASL',
  '21': 'MD5 hash authentication',
  '22': 'Colin Dean xvp'
};

Handshake.prototype = Object.create(BaseState.prototype);

Handshake.prototype.handleMessage = function (msg) {
  if (!this.version) {
    console.log('Handling version');
    var v = (msg.match(/(\d+\.\d+)/) || [])[1];
    if (!v) {
      throw new Error('Unknown version');
    }
    v = parseFloat(v);
    if (v < 3.008) {
      throw new Error('Unsupported version');
    }
    this.version = msg;
    this.setMessageType(MESSAGE_TYPES.ARRAY_BUFFER);
    console.info('Working with version', msg);
    this.send('RFB 003.008\n');
    return;
  }
  if (!this.securityTypes) {
    // TODO
    // could be zero
    // in this case go to page 9 of the spec
    console.log('Handling security...');
    var u8 = new Uint8Array(msg);
    this.securityTypes = u8[0];
    console.info(this.securityTypes + ' security types discovered');
    return;
  }
  if (!this.security) {
    var types = new Uint8Array(msg);
    var current;
    var toUse;
    for (var i = 0; i < types.length; i += 1) {
      current = types[i].toString();
      if (!this.supportedSecurity[current]) {
        console.warn(SECURITY_TYPES[current] + ' not supported');
      } else {
        toUse = current;
      }
    }
    this.security = parseInt(toUse);
    if (this.security) {
      console.info(SECURITY_TYPES[toUse] + ' security will be used');
    }
    this.send(new Uint8Array([this.security]));
    return;
  }
  console.log(msg);
};
