/*jshint node:true, laxcomma:true */

var util = require('util');
var http = require('http');

function RubanBackend(startupTime, config, emitter){

  var isDevice = false;

  var self = this;
  this.lastFlush = startupTime;
  this.lastException = startupTime;
  this.config = config.console || {};

  // attach
  emitter.on('flush', function(timestamp, metrics) { self.flush(timestamp, metrics); });
  emitter.on('status', function(callback) { self.status(callback); });
}

RubanBackend.prototype.flush = function(timestamp, metrics) {
  console.log('Flushing stats at ', new Date(timestamp * 1000).toString());

  var timers = metrics.timers;
  var data = [];
  for (var key in timers) {
    var values = timers[key];
    for (var index =0; index < values.length; index++) {
      if (values[index] > 0) {
        data.push({ UUID: this.config.appKey, name: "davra.response.times", value: values[index], msg_type: "datum", tags: { url: parseKey(key) } });
      }
    }
  }

  if (data.length > 0) {
    sendDataToRuBAN(this.config, data);
  }
};

//http.get.hello.response_time
function parseKey(key) {
  return key;
}

function getRequest(host, url, body) {
  return new http.ClientRequest({
    hostname: host,
    port: 58000,
    path: url,
    method: "PUT",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
    }
  });
}

function createDevice(config) {
  var data = {
    serialNumber: this.config.appKey,
    name: this.config.appKey,
    ipAddress: config.rubanUrl
  };

  var body = JSON.stringify(data);
  var request = getRequest(config.rubanUrl, "/api/v1/iotdata", body);
  request.end(body)
}

function sendDataToRuBAN(config, data) {
  if(!RubanBackend.isDevice){
    createDevice(config);
    RubanBackend.isDevice = true;
  }
  var body = JSON.stringify(data);
  var request = getRequest(config.rubanUrl, "/api/v1/iotdata", body);
  request.end(body)
}

RubanBackend.prototype.status = function(write) {
  ['lastFlush', 'lastException'].forEach(function(key) {
    write(null, 'console', key, this[key]);
  }, this);
};

exports.init = function(startupTime, config, events) {
  var instance = new RubanBackend(startupTime, config, events);
  return true;
};
