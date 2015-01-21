'use strict';

/* global Handshake, RfbLifeSpan, LaserTag */

var bridge = new LaserTag({
  host: '192.168.0.118',
  port: 5900
});
var rfbHandshake = new Handshake(bridge);
var rfbLifeSpan = new RfbLifeSpan(bridge);
bridge.setStates(rfbHandshake, rfbLifeSpan);

bridge.connect();