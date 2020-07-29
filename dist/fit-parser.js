'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _binary = require('./binary');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FitParser = function () {
  function FitParser() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, FitParser);

    this.options = {
      force: options.force != null ? options.force : true,
      speedUnit: options.speedUnit || 'm/s',
      lengthUnit: options.lengthUnit || 'm',
      temperatureUnit: options.temperatureUnit || 'celsius',
      elapsedRecordField: options.elapsedRecordField || false,
      mode: options.mode || 'list'
    };
  }

  _createClass(FitParser, [{
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

      var protocolVersion = blob[1];
      var profileVersion = blob[2] + (blob[3] << 8);
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
      fitObj.protocolVersion = protocolVersion;
      fitObj.profileVersion = profileVersion;

      var sessions = [];
      var laps = [];
      var records = [];
      var events = [];
      var hrv = [];
      var devices = [];
      var applications = [];
      var fieldDescriptions = [];
      var dive_gases = [];
      var course_points = [];
      var sports = [];
      var monitors = [];
      var stress = [];
      var definitions = [];
      var file_ids = [];
      var monitor_info = [];
      var lengths = [];

      var tempLaps = [];
      var tempLengths = [];
      var tempRecords = [];

      var loopIndex = headerLength;
      var messageTypes = [];
      var developerFields = [];

      var isModeCascade = this.options.mode === 'cascade';
      var isCascadeNeeded = isModeCascade || this.options.mode === 'both';

      var startDate = void 0,
          lastStopTimestamp = void 0;
      var pausedTime = 0;

      while (loopIndex < crcStart) {
        var _readRecord = (0, _binary.readRecord)(blob, messageTypes, developerFields, loopIndex, this.options, startDate, pausedTime),
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
              message.lengths = tempLengths;
              tempLengths = [];
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
            if (message.event === 'timer') {
              if (message.event_type === 'stop_all') {
                lastStopTimestamp = message.timestamp;
              } else if (message.event_type === 'start' && lastStopTimestamp) {
                pausedTime += (message.timestamp - lastStopTimestamp) / 1000;
              }
            }
            events.push(message);
            break;
          case 'length':
            if (isCascadeNeeded) {
              tempLengths.push(message);
            }
            lengths.push(message);
            break;
          case 'hrv':
            hrv.push(message);
            break;
          case 'record':
            if (!startDate) {
              startDate = message.timestamp;
              message.elapsed_time = 0;
              message.timer_time = 0;
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
          case 'developer_data_id':
            applications.push(message);
            break;
          case 'dive_gas':
            dive_gases.push(message);
            break;
          case 'course_point':
            course_points.push(message);
            break;
          case 'sport':
            sports.push(message);
            break;
          case 'file_id':
            if (message) {
              file_ids.push(message);
            }
            break;
          case 'definition':
            if (message) {
              definitions.push(message);
            }
            break;
          case 'monitoring':
            monitors.push(message);
            break;
          case 'monitoring_info':
            monitor_info.push(message);
            break;
          case 'stress_level':
            stress.push(message);
            break;
          case 'software':
            fitObj.software = message;
            break;
          default:
            if (messageType !== '') {
              fitObj[messageType] = message;
            }
            break;
        }
      }

      if (isCascadeNeeded) {
        fitObj.activity = fitObj.activity || {};
        fitObj.activity.sessions = sessions;
        fitObj.activity.events = events;
        fitObj.activity.hrv = hrv;
        fitObj.activity.device_infos = devices;
        fitObj.activity.developer_data_ids = applications;
        fitObj.activity.field_descriptions = fieldDescriptions;
        fitObj.activity.sports = sports;
      }
      if (!isModeCascade) {
        fitObj.sessions = sessions;
        fitObj.laps = laps;
        fitObj.lengths = lengths;
        fitObj.records = records;
        fitObj.events = events;
        fitObj.device_infos = devices;
        fitObj.developer_data_ids = applications;
        fitObj.field_descriptions = fieldDescriptions;
        fitObj.hrv = hrv;
        fitObj.dive_gases = dive_gases;
        fitObj.course_points = course_points;
        fitObj.sports = sports;
        fitObj.devices = devices;
        fitObj.monitors = monitors;
        fitObj.stress = stress;
        fitObj.file_ids = file_ids;
        fitObj.monitor_info = monitor_info;
        fitObj.definitions = definitions;
      }

      callback(null, fitObj);
    }
  }]);

  return FitParser;
}();

exports.default = FitParser;