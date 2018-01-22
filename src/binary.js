import { FIT } from './fit';
import { getFitMessage, getFitMessageBaseType } from './messages';

export function addEndian(littleEndian, bytes) {
    let result = 0;
    if (!littleEndian) bytes.reverse();
    for (let i = 0; i < bytes.length; i++) {
        result += (bytes[i] << (i << 3)) >>> 0;
    }

    return result;
}

function readData(blob, fDef, startIndex) {
    if (fDef.endianAbility === true) {
        const temp = [];
        for (let i = 0; i < fDef.size; i++) {
            temp.push(blob[startIndex + i]);
        }
        const uint32Rep = addEndian(fDef.littleEndian, temp);

        if (fDef.type === 'sint32') {
            return (uint32Rep >> 0);
        }

        return uint32Rep;
    }
    return blob[startIndex];
}

function formatByType(data, type, scale, offset) {
    switch (type) {
        case 'date_time': return new Date((data * 1000) + 631065600000);
        case 'sint32':
        case 'sint16':
            return data * FIT.scConst;
        case 'uint32':
        case 'uint16':
            return scale ? data / scale + offset : data;
        default:
            if (FIT.types[type]) {
                return FIT.types[type][data];
            }
            return data;
    }
}

function isInvalidValue(data, type) {
    switch (type) {
      case 'enum': return data === 0xFF;
      case 'sint8': return data === 0x7F;
      case 'uint8': return data === 0xFF;
      case 'sint16': return data === 0x7FFF;
      case 'unit16': return data === 0xFFFF;
      case 'sint32': return data === 0x7FFFFFFF;
      case 'uint32': return data === 0xFFFFFFFF;
      case 'string': return data === 0x00;
      case 'float32': return data === 0xFFFFFFFF;
      case 'float64': return data === 0xFFFFFFFFFFFFFFFF;
      case 'uint8z': return data === 0x00;
      case 'uint16z': return data === 0x0000;
      case 'uint32z': return data === 0x000000;
      case 'byte': return data === 0xFF;
      case 'sint64': return data === 0x7FFFFFFFFFFFFFFF;
      case 'uint64': return data === 0xFFFFFFFFFFFFFFFF;
      case 'uint64z': return data === 0x0000000000000000;
      default: return false;
    }
  }

function convertTo(data, unitsList, speedUnit) {
    const unitObj = FIT.options[unitsList][speedUnit];
    return unitObj ? data * unitObj.multiplier + unitObj.offset : data;
}

function applyOptions(data, field, options) {
    switch (field) {
        case 'speed':
        case 'enhanced_speed':
        case 'vertical_speed':
        case 'avg_speed':
        case 'max_speed':
        case 'speed_1s':
        case 'ball_speed':
        case 'enhanced_avg_speed':
        case 'enhanced_max_speed':
        case 'avg_pos_vertical_speed':
        case 'max_pos_vertical_speed':
        case 'avg_neg_vertical_speed':
        case 'max_neg_vertical_speed':
            return convertTo(data, 'speedUnits', options.speedUnit);
        case 'distance':
        case 'total_distance':
        case 'enhanced_avg_altitude':
        case 'enhanced_min_altitude':
        case 'enhanced_max_altitude':
        case 'enhanced_altitude':
        case 'height':
        case 'odometer':
        case 'avg_stroke_distance':
        case 'min_altitude':
        case 'avg_altitude':
        case 'max_altitude':
        case 'total_ascent':
        case 'total_descent':
        case 'altitude':
        case 'cycle_length':
        case 'auto_wheelsize':
        case 'custom_wheelsize':
        case 'gps_accuracy':
            return convertTo(data, 'lengthUnits', options.lengthUnit);
        case 'temperature':
        case 'avg_temperature':
        case 'max_temperature':
            return convertTo(data, 'temperatureUnits', options.temperatureUnit);
        default: return data;
    }
}

export function readRecord(blob, messageTypes, startIndex, options, startDate) {
    const recordHeader = blob[startIndex];
    const localMessageType = (recordHeader & 15);

    if ((recordHeader & 64) === 64) {
        // is definition message
        // startIndex + 1 is reserved

        const lEnd = blob[startIndex + 2] === 0;
        const mTypeDef = {
            littleEndian: lEnd,
            globalMessageNumber: addEndian(lEnd, [blob[startIndex + 3], blob[startIndex + 4]]),
            numberOfFields: blob[startIndex + 5],
            fieldDefs: [],
        };

        const message = getFitMessage(mTypeDef.globalMessageNumber);

        for (let i = 0; i < mTypeDef.numberOfFields; i++) {
            const fDefIndex = startIndex + 6 + (i * 3);
            const baseType = blob[fDefIndex + 2];
            const { field, type } = message.getAttributes(blob[fDefIndex]);
            const fDef = {
                type,
                fDefNo: blob[fDefIndex],
                size: blob[fDefIndex + 1],
                endianAbility: (baseType & 128) === 128,
                littleEndian: lEnd,
                baseTypeNo: (baseType & 15),
                name: field,
                dataType: getFitMessageBaseType(baseType & 15),
            };

            mTypeDef.fieldDefs.push(fDef);
        }
        messageTypes[localMessageType] = mTypeDef;

        return {
            messageType: 'fieldDescription',
            nextIndex: startIndex + 6 + (mTypeDef.numberOfFields * 3)
        };
    }

    let messageType;

    if (messageTypes[localMessageType]) {
        messageType = messageTypes[localMessageType];
    } else {
        messageType = messageTypes[0];
    }

    // TODO: handle compressed header ((recordHeader & 128) == 128)

    // uncompressed header
    let messageSize = 0;
    let readDataFromIndex = startIndex + 1;
    const fields = {};
    const message = getFitMessage(messageType.globalMessageNumber);

    for (let i = 0; i < messageType.fieldDefs.length; i++) {
        const fDef = messageType.fieldDefs[i];
        const data = readData(blob, fDef, readDataFromIndex);
        
        if (!isInvalidValue(data, fDef.type)) {
            const { field, type, scale, offset } = message.getAttributes(fDef.fDefNo);
            if (field !== 'unknown' && field !== '' && field !== undefined) {
                fields[field] = applyOptions(formatByType(data, type, scale, offset), field, options);
            }

            if (message.name === 'record' && options.elapsedRecordField) {
                fields.elapsed_time = (fields.timestamp - startDate) / 1000;
            }
        }

        readDataFromIndex += fDef.size;
        messageSize += fDef.size;
    }

    const result = {
        messageType: message.name,
        nextIndex: startIndex + messageSize + 1,
        message: fields,
    };

    return result;

}

export function getArrayBuffer(buffer) {
    if(buffer instanceof ArrayBuffer) {
        return buffer;
    }
    const ab = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

export function calculateCRC(blob, start, end) {
    const crcTable = [
        0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
        0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400,
    ];

    let crc = 0;
    for (let i = start; i < end; i++) {
        const byte = blob[i];
        let tmp = crcTable[crc & 0xF];
        crc = (crc >> 4) & 0x0FFF;
        crc = crc ^ tmp ^ crcTable[byte & 0xF];
        tmp = crcTable[crc & 0xF];
        crc = (crc >> 4) & 0x0FFF;
        crc = crc ^ tmp ^ crcTable[(byte >> 4) & 0xF];
    }

    return crc;
}
