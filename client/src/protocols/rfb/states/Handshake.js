'use strict';

/* global BaseState, MESSAGE_TYPES */

function Handshake(bridge) {
  BaseState.call(this, bridge, MESSAGE_TYPES.BINARY_STRING);
  this.version = null;
  this.supportedSecurity = {
    '1': true
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

//Handshake.prototype.handleMessage = function (msg) {
//  if (!this.version) {
//    console.log('Handling version');
//    var v = (msg.match(/(\d+\.\d+)/) || [])[1];
//    if (!v) {
//      throw new Error('Unknown version');
//    }
//    v = parseFloat(v);
//    if (v < 3.008) {
//      throw new Error('Unsupported version');
//    }
//    this.version = msg;
//    this.setMessageType(MESSAGE_TYPES.ARRAY_BUFFER);
//    console.info('Working with version', msg);
//    this.send('RFB 003.008\n');
//    return;
//  }
//  if (!this.securityTypes) {
//    // TODO
//    // could be zero
//    // in this case go to page 9 of the spec
//    console.log('Handling security...');
//    var u8 = new Uint8Array(msg);
//    this.securityTypes = u8[0];
//    console.info(this.securityTypes + ' security types discovered');
//    return;
//  }
//  if (!this.security) {
//    var types = new Uint8Array(msg);
//    var current;
//    var toUse;
//    for (var i = 0; i < types.length; i += 1) {
//      current = types[i].toString();
//      if (!this.supportedSecurity[current]) {
//        console.warn(SECURITY_TYPES[current] + ' not supported');
//      } else {
//        toUse = current;
//      }
//    }
//    this.security = parseInt(toUse);
//    if (this.security) {
//      console.info(SECURITY_TYPES[toUse] + ' security will be used');
//    }
//    this.setMessageType(MESSAGE_TYPES.ARRAY_BUFFER);
//    this.send(new Uint8Array([this.security]));
//    return;
//  }
//  if (!this.securityHandshakeDone) {
//    function convertWordArrayToUint8Array(wordArray) {
//      var len = wordArray.words.length;
//      console.log(len);
//      var u8_array = new Uint8Array(len * 2);
//      var offset = 0, word, i;
//      for (i = 0; i < len; i++) {
//        word = wordArray.words[i];
//        u8_array[offset++] = word & 0b0000000011111111;
//        u8_array[offset++] = word >>> 8;
//      }
//      return u8_array;
//    }
//    function convertUint8ArrayToBinaryString(u8Array) {
//      var i, len = u8Array.length, b_str = "";
//      for (i=0; i<len; i++) {
//        b_str += String.fromCharCode(u8Array[i]);
//      }
//      return b_str;
//    }
//    msg = new Uint8Array(msg);
//    if (msg.length === 16) {
//      console.log(msg.length);
//      var res = CryptoJS.DES.encrypt(convertUint8ArrayToBinaryString(msg), 'paralaks', { mode: CryptoJS.mode.OFB });
//      if (res.ciphertext.words.length === 8) {
//        res = convertWordArrayToUint8Array(res.ciphertext);
//        console.log(res.length);
//        this.send(res);
//      } else {
//        console.error('Error while encryping');
//      }
//    }
////    this.send(res);
//    return;
//  }
//  console.log(msg);
//};
//

function BlobReader(blob) {
  if (!(this instanceof BlobReader)) {
    return new BlobReader(blob);
  }
  this.blob = blob;
  this.current = 0;
}

BlobReader.prototype.read = function (num, arrType) {
  var reader = new FileReader();
  var deferred = Promise.defer();
  reader.onload = function (e) {
    if (arrType) {
      deferred.resolve(new arrType(e.target.result));
    } else {
      deferred.resolve(e.target.result);
    }
  };
  reader.readAsArrayBuffer(this.blob.slice(this.current, this.current + num));
  this.current += num;
  return deferred.promise;
};

Handshake.prototype.handleMessage = function (msg) {
  var i;
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
  if (!this.security) {
    var types = new Uint8Array(msg);
    var current;
    var toUse;
    for (i = 0; i < types.length; i += 1) {
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
    this.setMessageType(MESSAGE_TYPES.ARRAY_BUFFER);
    this.send(new Uint8Array([this.security]));
    return;
  }
  if (!this.securityCompleted) {
    var arr = new Uint8Array(msg);
    var res = 0;
    for (i = 0; i < arr.length; i += 1) {
      res |= arr[i];
    }
    if (!res) {
      this.securityCompleted = true;
      console.info('Connection established');
      this.send(new Uint8Array([1]));
    }
    return;
  }
  if (!this.serverInitMessage) {
    console.log('Handling ServerInit');
    var blob = new Blob([msg]);
    var reader = BlobReader(blob);
    reader.read(2, Uint16Array, function () {
    })
    .read(2, Uint8Array, function () {
    });
      .then(function (res) {
        console.log(res[0]);
      });
    console.info('Width', unpack.read(2), 'height', unpack.read(2));
//    console.info('Name length', arr32[5]);
  }
  console.log(msg);
};
