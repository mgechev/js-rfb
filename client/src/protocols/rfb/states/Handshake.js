'use strict';

/*jshint bitwise: false*/

(function (w) {

  function getEndianness() {
    var a = new ArrayBuffer(4);
    var b = new Uint8Array(a);
    var c = new Uint32Array(a);
    b[0] = 0xa1;
    b[1] = 0xb2;
    b[2] = 0xc3;
    b[3] = 0xd4;
    if (c[0] === 0xd4c3b2a1) {
      return BlobReader.ENDIANNESS.LITTLE_ENDIAN;
    }
    if (c[0] === 0xa1b2c3d4) {
      return BlobReader.ENDIANNESS.BIG_ENDIAN;
    } else {
      throw new Error('Unrecognized endianness');
    }
  }
  /**
   * Constructor function for the blob reader.
   *
   * @public
   * @constructor
   * @param {Blob} blob The blob object, which should be read
   * @param {BlobReader.ENDIANNESS} dataEndianness Endianness of the
   *  expected data
   * @param {BlobReader.ENDIANNESS} endianness System endianness
   */
  function BlobReader(blob, dataEndianness, endianness) {
    if (!(this instanceof BlobReader)) {
      return new BlobReader(blob, dataEndianness, endianness);
    }
    this._blob = blob;
    this._position = 0;
    this._queue = [];
    this._currentEndianness = endianness || getEndianness();
    this._dataEndianness = dataEndianness || this._currentEndianness;
    this._pendingTask = false;
    this._currentResult = null;
  }

  BlobReader.ARRAY_BUFFER = 'ArrayBuffer';
  BlobReader.BINARY_STRING = 'BinaryString';
  BlobReader.TEXT = 'Text';
  BlobReader.DATA_URL = 'DataURL';

  BlobReader.ENDIANNESS = {
    BIG_ENDIAN: 'BIG_ENDIAN',
    LITTLE_ENDIAN: 'LITTLE_ENDIAN'
  };

  BlobReader.prototype.setDataEndianness = function (endianness) {
    this._dataEndianness = endianness;
  };

  /* jshint validthis: true */
  function invokeNext() {
    var current = this._queue.shift();
    if (!current) {
      return;
    }
    if (this._position + current.count > this._blob.size) {
      throw new Error('Limit reached. Trying to read ' +
          (this._position + current.count) + ' bytes out of ' +
          this._blob.size + '.');
    }
    var reader = new FileReader();
    this._pendingTask = true;
    reader.onload = function (e) {
      var data = e.target.result;
      this._pendingTask = false;
      current.cb(data);
      invokeNext.call(this);
    }.bind(this);
    reader.onerror = function () {
      throw new Error('Error while reading the blob');
    };
    if (!current.type) {
      current.type = BlobReader.BINARY_STRING;
    }
    reader['readAs' + current.type](
        this._blob.slice(this._position, this._position + current.count)
    );
    this._position += current.count;
  }

  /**
   * Read definite amount of bytes by the blob
   *
   * @public
   * @param {Number} count The count of bytes, which should be read
   * @param {Function} cb The callback, which should be
   *  invoked once the bytes are read
   * @return {BlobReader} Returns `this`
   */
  BlobReader.prototype.read = function (count, type, cb) {
    if (typeof count === 'string') {
      cb = type;
      count = undefined;
      type = count;
    }
    if (count === undefined) {
      count = this._blob.size - this._position;
    }
    if (typeof count === 'function') {
      cb = count;
      type = undefined;
      count = this._blob.size - this._position;
    }
    if (typeof type === 'function') {
      cb = type;
      type = undefined;
    }
    this._queue.push({
      count: count,
      cb: cb,
      type: type
    });
    if (!this._pendingTask) {
      invokeNext.call(this);
    }
    return this;
  };

  /**
   * Read defined amount of bytes as text
   *
   * @public
   * @param {Number} count Number of bytes to be read
   * @param {Function} cb Calback to be invoked
   * @return {BlobReader} Return the target object
   */
  BlobReader.prototype.readText = function (count, cb) {
    return this.read(count, BlobReader.TEXT, cb);
  };

  /**
   * Read defined amount of bytes as array buffer
   *
   * @public
   * @param {Number} count Number of bytes to be read
   * @param {Function} cb Calback to be invoked
   * @return {BlobReader} Return the target object
   */
  BlobReader.prototype.readArrayBuffer = function (count, cb) {
    return this.read(count, BlobReader.ARRAY_BUFFER, cb);
  };

  /**
   * Read defined amount of bytes as binary string
   *
   * @public
   * @param {Number} count Number of bytes to be read
   * @param {Function} cb Calback to be invoked
   * @return {BlobReader} Return the target object
   */
  BlobReader.prototype.readBinaryString = function (count, cb) {
    return this.read(count, BlobReader.BINARY_STRING, cb);
  };

  /**
   * Read defined amount of bytes as data url
   *
   * @public
   * @param {Number} count Number of bytes to be read
   * @param {Function} cb Calback to be invoked
   * @return {BlobReader} Return the target object
   */
  BlobReader.prototype.readDataURL = function (count, cb) {
    return this.read(count, BlobReader.DATA_URL, cb);
  };

  function swap(arr, cb) {
    for (var i = 0; i < arr.length; i += 1) {
      arr[i] = cb(arr[i]);
    }
    return arr;
  }

  var byteFormatter = {
    swap8: function (arr) {
      return swap(arr, function (val) {
        return val;
      });
    },
    swap16: function (arr) {
      return swap(arr, function (val) {
        return ((val & 0xFF) << 8) |
               ((val >> 8) & 0xFF);
      });
    },
    swap32: function (arr) {
      return swap(arr, function (val) {
        return ((val & 0xFF) << 24) |
               ((val & 0xFF00) << 8) |
               ((val >> 8) & 0xFF00) |
               ((val >> 24) & 0xFF);
      });
    }
  };

  /* jshint validthis: true */
  function uintReader(name, count, octets, endianness) {
    if (!this._currentResult) {
      this._currentResult = {};
    }
    count = (count || 1) * octets;
    var callback = function (data) {
      var bitsNum = 8 * octets;
      var type = window['Uint' + bitsNum + 'Array'];
      data = new type(data);
      if (this._currentEndianness !== endianness) {
        data = byteFormatter['swap' + bitsNum](data);
      }
      this._currentResult[name] = data;
    }.bind(this);
    return this.readArrayBuffer(count, callback);
  }

  /**
   * Read defined amount of bytes as uint8 array
   *
   * @public
   * @param {String} name Property name
   * @param {Number} count Number of 8 bit numbers to be read
   * @param {BlobReader.ENDIANNESS} endianness Endianness of the
   *  bytes which should be read. If differ from the system's endianness
   *  the values will be converted
   * @return {BlobReader} Return the target object
   */
  BlobReader.prototype.readUint8 = function (name, count, endianness) {
    return uintReader.call(this, name, count, 1,
           endianness || this._dataEndianness);
  };

  /**
   * Read defined amount of bytes as uint16 array
   *
   * @public
   * @param {String} name Property name
   * @param {Number} count Number of 16 bit numbers to be read
   * @param {BlobReader.ENDIANNESS} endianness Endianness of the
   *  bytes which should be read. If differ from the system's endianness
   *  the values will be converted
   * @return {BlobReader} Return the target object
   */
  BlobReader.prototype.readUint16 = function (name, count, endianness) {
    return uintReader.call(this, name, count, 2,
           endianness || this._dataEndianness);
  };

  /**
   * Read defined amount of bytes as uint32 array
   *
   * @public
   * @param {String} name Property name
   * @param {Number} count Number of 32 bit numbers to be read
   * @param {BlobReader.ENDIANNESS} endianness Endianness of the
   *  bytes which should be read. If differ from the system's endianness
   *  the values will be converted
   * @return {BlobReader} Return the target object
   */
  BlobReader.prototype.readUint32 = function (name, count, endianness) {
    return uintReader.call(this, name, count, 4,
           endianness || this._dataEndianness);
  };

  /**
   * Read a blob and push it to the result object
   *
   * @public
   * @param {String} name Property name
   * @param {Number} count Number of bytes to be sliced from the Blob
   * @return {BlobReader} Return the target object
   */
  BlobReader.prototype.readBlob = function (name, count) {
    var result = this._blob.slice(this._position, this._position + count);
    this._queue.push({
      count: count,
      cb: function () {
        this._currentResult[name] = result;
      }.bind(this)
    });
    return this;
  };

  /**
   * Gets the result object
   *
   * @public
   * @return {Object} The object resulted from the calls of readUint
   */
  BlobReader.prototype.commit = function (cb) {
    if (!this._currentResult) {
      throw new Error('Cannot commit without any reads');
    }
    var res = this._currentResult;
    var task = {
      count: 0,
      type: BlobReader.ARRAY_BUFFER,
      cb: function () {
        cb(res);
        this._currentResult = null;
      }.bind(this)
    };
    this._queue.push(task);
    return this;
  };

  w.BlobReader = BlobReader;

}(window));

/* global BaseState, MESSAGE_TYPES, BlobReader */

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
//      var res = CryptoJS.DES.encrypt
//      (convertUint8ArrayToBinaryString(msg),
//      'paralaks', { mode: CryptoJS.mode.OFB });
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

//function BlobReader(blob) {
//  if (!(this instanceof BlobReader)) {
//    return new BlobReader(blob);
//  }
//  this.blob = blob;
//  this.current = 0;
//}
//
//BlobReader.prototype.read = function (num, arrType) {
//  var reader = new FileReader();
//  var deferred = Promise.defer();
//  reader.onload = function (e) {
//    if (arrType) {
//      deferred.resolve(new arrType(e.target.result));
//    } else {
//      deferred.resolve(e.target.result);
//    }
//  };
//  reader['readAs' + arrType](
//      this.blob.slice(this.current, this.current + num));
//  this.current += num;
//  return deferred.promise;
//};

Handshake.prototype.handleMessage = function (msg) {
  var i;
  if (!this.version) {
    var v = (msg.match(/(\d+\.\d+)/) || [])[1];
    if (!v) {
      throw new Error('Unknown version');
    }
    v = parseFloat(v);
    if (v < 3.003) {
      throw new Error('Unsupported version');
    }
    this.version = msg;
    this.setMessageType(MESSAGE_TYPES.ARRAY_BUFFER);
    console.info('Working with version', msg);
    this.send('RFB 003.008\n');
    return;
  }
  if (!this.security) {
    BlobReader(new Blob([msg]), BlobReader.ENDIANNESS.BIG_ENDIAN)
      .readUint8('types')
      .commit(function (obj) {
        var types = obj.types;
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
      }.bind(this));
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
    var blob = new Blob([msg]);
    var reader = BlobReader(blob, BlobReader.ENDIANNESS.BIG_ENDIAN);
    reader
    .readUint16('width')
    .readUint16('height')
    .readBlob('pixelFormat', 16)
    .readUint32('len')
    .commit(function (result) {
      var width = result.width[0];
      var height = result.height[0];
      var len = result.len[0];
      reader
      .readText(len, function (name) {
        console.info('Width: ' + width + ', height: ' +
          height + ', len: ' + len + ', hostname: ' + name);
      });
    });
    return;
  }
  console.log(msg);
};
