import { getArrayBuffer, calculateCRC, readRecord } from './binary';
import { encodeFile, encodeRecordGroup } from './binary-encode';

export default class EasyFit {
  constructor(options = {}) {
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

  encode(fitObj) {

    //encode data first, to determine size
    let chunks = encodeFile(fitObj)
    let dataSize = chunks.reduce((acc, val) => acc + val.byteLength, 0)
    let headerLength = 12;

    const buf = new ArrayBuffer(headerLength + dataSize + 2); //CRC is length 2

    //write header
    const header = new DataView(buf, 0, headerLength)
    header.setUint8(0, headerLength, true); //header length
    header.setUint8(1, 0x10, true); //protocol version
    header.setUint16(2, 108, true); //profile version
    header.setUint32(4, dataSize, true); //data length

    let fileTypeString = '.FIT';
    for (let i = 0; i < 4; i++) {
      header.setInt8(i + 8, fileTypeString.charCodeAt(i));
    }

    //write data
    let pos = headerLength;

    for(let chunk of chunks) {
      new Uint8Array(buf, pos, chunk.byteLength).set(new Uint8Array(chunk));
      pos += chunk.byteLength;
    }

    //write crc
    let fileCRC = calculateCRC(new Uint8Array(buf), 0, pos);
    new DataView(buf, pos, 2).setUint16(0, fileCRC, true);

    return buf;
  }

  parse(content, callback) {
    const blob = new Uint8Array(getArrayBuffer(content));

    if (blob.length < 12) {
      callback('File to small to be a FIT file', {});
      if (!this.options.force) {
        return;
      }
    }

    const headerLength = blob[0];
    if (headerLength !== 14 && headerLength !== 12) {
      callback('Incorrect header size', {});
      if (!this.options.force) {
        return;
      }
    }

    let fileTypeString = '';
    for (let i = 8; i < 12; i++) {
      fileTypeString += String.fromCharCode(blob[i]);
    }
    if (fileTypeString !== '.FIT') {
      callback('Missing \'.FIT\' in header', {});
      if (!this.options.force) {
        return;
      }
    }

    if (headerLength === 14) {
      const crcHeader = blob[12] + (blob[13] << 8);
      const crcHeaderCalc = calculateCRC(blob, 0, 12);
      if (crcHeader !== crcHeaderCalc) {
        // callback('Header CRC mismatch', {});
        // TODO: fix Header CRC check
        if (!this.options.force) {
          return;
        }
      }
    }
    const dataLength = blob[4] + (blob[5] << 8) + (blob[6] << 16) + (blob[7] << 24);
    const crcStart = dataLength + headerLength;
    const crcFile = blob[crcStart] + (blob[crcStart + 1] << 8);
    const crcFileCalc = calculateCRC(blob, headerLength === 12 ? 0 : headerLength, crcStart);

    if (crcFile !== crcFileCalc) {
      // callback('File CRC mismatch', {});
      // TODO: fix File CRC check
      if (!this.options.force) {
        return;
      }
    }

    const fitObj = {};
    const sessions = [];
    const laps = [];
    const records = [];
    const events = [];

    let tempLaps = [];
    let tempRecords = [];

    let loopIndex = headerLength;
    const messageTypes = [];

    const isModeCascade = this.options.mode === 'cascade';
    const isCascadeNeeded = isModeCascade || this.options.mode === 'both';

    let startDate;

    while (loopIndex < crcStart) {
      const { nextIndex,
        messageType,
        message } = readRecord(blob, messageTypes, loopIndex, this.options, startDate);
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
}

