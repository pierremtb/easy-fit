'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _binary = require('./binary');

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

      var fitObj = {};
      var sessions = [];
      var laps = [];
      var records = [];
      var events = [];
      var devices = [];
      var fieldDescriptions = [];

      var tempLaps = [];
      var tempRecords = [];

      var loopIndex = headerLength;
      var messageTypes = [];
      var developerFields = [];

      var isModeCascade = this.options.mode === 'cascade';
      var isCascadeNeeded = isModeCascade || this.options.mode === 'both';

      var startDate = void 0;

      while (loopIndex < crcStart) {
        var _readRecord = (0, _binary.readRecord)(blob, messageTypes, developerFields, loopIndex, this.options, startDate),
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
          case 'field_description':
            fieldDescriptions.push(message);
            break;
          case 'device_info':
            devices.push(message);
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
        fitObj.devices = devices;
        fitObj.field_descriptions = fieldDescriptions;
      }

      callback(null, fitObj);
    }
  }]);

  return EasyFit;
}();

exports.default = EasyFit;