'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _binary = require('./binary');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EasyFit = function () {
  function EasyFit() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, EasyFit);

    this.options = {
      force: options.force || false,
      speedUnit: options.speedUnit || 'm/s',
      lengthUnit: options.lengthUnit || 'm',
      temperatureUnit: options.temperatureUnit || 'celsius'
    };
  }

  _createClass(EasyFit, [{
    key: 'parse',
    value: function parse(content, callback) {
      var blob = new Uint8Array((0, _binary.getArrayBuffer)(content));

      if (blob.length < 12) {
        callback('File to small to be a FIT file', {});
        if (!this.options.force) {
          return;
        }
      }

      var headerLength = blob[0];
      if (headerLength !== 14 && headerLength !== 12) {
        callback('Incorrect header size', {});
        if (!this.options.force) {
          return;
        }
      }

      var fileTypeString = '';
      for (var i = 8; i < 12; i++) {
        fileTypeString += String.fromCharCode(blob[i]);
      }
      if (fileTypeString !== '.FIT') {
        callback('Missing \'.FIT\' in header', {});
        if (!this.options.force) {
          return;
        }
      }

      if (headerLength === 14) {
        var crcHeader = blob[12] + (blob[13] << 8);
        var crcHeaderCalc = (0, _binary.calculateCRC)(blob, 0, 12);
        if (crcHeader !== crcHeaderCalc) {
          // callback('Header CRC mismatch', {});
          // TODO: fix Header CRC check
          if (!this.options.force) {
            return;
          }
        }
      }
      var dataLength = blob[4] + (blob[5] << 8) + (blob[6] << 16) + (blob[7] << 24);
      var crcStart = dataLength + headerLength;
      var crcFile = blob[crcStart] + (blob[crcStart + 1] << 8);
      var crcFileCalc = (0, _binary.calculateCRC)(blob, headerLength === 12 ? 0 : headerLength, crcStart);

      if (crcFile !== crcFileCalc) {
        // callback('File CRC mismatch', {});
        // TODO: fix File CRC check
        if (!this.options.force) {
          return;
        }
      }

      var sessions = [];
      var laps = [];
      var records = [];
      var events = [];

      var loopIndex = headerLength;
      var messageTypes = [];

      while (loopIndex < crcStart) {
        var _readRecord = (0, _binary.readRecord)(blob, messageTypes, loopIndex, this.options);

        var nextIndex = _readRecord.nextIndex;
        var messageType = _readRecord.messageType;
        var message = _readRecord.message;

        loopIndex = nextIndex;
        switch (messageType) {
          case 'lap':
            laps.push(message);
            break;
          case 'session':
            sessions.push(message);
            break;
          case 'event':
            events.push(message);
            break;
          case 'record':
            records.push(message);
            break;
          default:
            break;
        }
      }

      callback(null, { sessions: sessions, laps: laps, records: records, events: events });
    }
  }]);

  return EasyFit;
}();

exports.default = EasyFit;