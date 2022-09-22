'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _binary = require('./binary');

var _binaryEncode = require('./binary-encode');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EasyFit = function () {
  function EasyFit() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, EasyFit);

    this.options = {
      force: options.force || true,
      speedUnit: options.speedUnit || 'm/s',
      lengthUnit: options.lengthUnit || 'm',
      temperatureUnit: options.temperatureUnit || 'celsius',
      elapsedRecordField: options.elapsedRecordField || false,
      mode: options.mode || 'list'
    };
  }

  /*
  {
  "file_id": {
    "serial_number": 3867897489,
    "time_created": "2015-10-12T14:47:44.000Z",
    "manufacturer": "garmin",
    "product": 1561,
    "number": 65535,
    "type": "activity"
  },
  "weight_scales": [{
      timestamp: 1021032143,
      weight: 85.3,
      percent_fat: 14.1,
      bone_mass: 3.7,
      muscle_mass: 71.4,
      metabolic_age: 28
    }
  ]
  }
  */

  _createClass(EasyFit, [{
    key: 'encode',
    value: function encode(fitObj) {

      //encode data first, to determine size
      var chunks = (0, _binaryEncode.encodeFile)(fitObj);
      var dataSize = chunks.reduce(function (acc, val) {
        return acc + val.byteLength;
      }, 0);
      var headerLength = 12;

      var buf = new ArrayBuffer(headerLength + dataSize + 2); //CRC is length 2

      //write header
      var header = new DataView(buf, 0, headerLength);
      header.setUint8(0, headerLength, true); //header length
      header.setUint8(1, 0x10, true); //protocol version
      header.setUint16(2, 108, true); //profile version
      header.setUint32(4, dataSize, true); //data length

      var fileTypeString = '.FIT';
      for (var i = 0; i < 4; i++) {
        header.setInt8(i + 8, fileTypeString.charCodeAt(i));
      }

      //write data
      var pos = headerLength;

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = chunks[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var chunk = _step.value;

          new Uint8Array(buf, pos, chunk.byteLength).set(new Uint8Array(chunk));
          pos += chunk.byteLength;
        }

        //write crc
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      var fileCRC = (0, _binary.calculateCRC)(new Uint8Array(buf), 0, pos);
      new DataView(buf, pos, 2).setUint16(0, fileCRC, true);

      return buf;
    }
  }, {
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

      var fitObj = {};
      var sessions = [];
      var laps = [];
      var records = [];
      var events = [];

      var tempLaps = [];
      var tempRecords = [];

      var loopIndex = headerLength;
      var messageTypes = [];

      var isModeCascade = this.options.mode === 'cascade';
      var isCascadeNeeded = isModeCascade || this.options.mode === 'both';

      var startDate = void 0;

      while (loopIndex < crcStart) {
        var _readRecord = (0, _binary.readRecord)(blob, messageTypes, loopIndex, this.options, startDate),
            nextIndex = _readRecord.nextIndex,
            messageType = _readRecord.messageType,
            message = _readRecord.message;

        loopIndex = nextIndex;
        switch (messageType) {
          case 'lap':
            if (isCascadeNeeded) {
              message.records = tempRecords;
              tempRecords = [];
              tempLaps.push(message);
            }
            laps.push(message);
            break;
          case 'session':
            if (isCascadeNeeded) {
              message.laps = tempLaps;
              tempLaps = [];
            }
            sessions.push(message);
            break;
          case 'event':
            events.push(message);
            break;
          case 'record':
            if (!startDate) {
              startDate = message.timestamp;
              message.elapsed_time = 0;
            }
            records.push(message);
            if (isCascadeNeeded) {
              tempRecords.push(message);
            }
            break;
          default:
            if (messageType !== '') {
              fitObj[messageType] = message;
            }
            break;
        }
      }

      if (isCascadeNeeded) {
        fitObj.activity.sessions = sessions;
        fitObj.activity.events = events;
      }
      if (!isModeCascade) {
        fitObj.sessions = sessions;
        fitObj.laps = laps;
        fitObj.records = records;
        fitObj.events = events;
      }

      callback(null, fitObj);
    }
  }]);

  return EasyFit;
}();

exports.default = EasyFit;