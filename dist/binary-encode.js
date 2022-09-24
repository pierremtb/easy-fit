'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.encodeFile = encodeFile;

var _fit = require('./fit');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var fileTypesByName = Object.fromEntries(Object.entries(_fit.FIT.types.file).map(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        k = _ref2[0],
        v = _ref2[1];

    return [v, parseInt(k)];
}));

var messageDefByName = Object.fromEntries(Object.entries(_fit.FIT.messages).map(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 2),
        k = _ref4[0],
        v = _ref4[1];

    return [v.name, Object.assign({ id: k }, v)];
}));

var fieldDefByFieldNameByMessageName = Object.fromEntries(Object.entries(_fit.FIT.messages).map(function (_ref5) {
    var _ref6 = _slicedToArray(_ref5, 2),
        messageId = _ref6[0],
        messageDef = _ref6[1];

    return [messageDef.name, Object.fromEntries(Object.entries(messageDef).map(function (_ref7) {
        var _ref8 = _slicedToArray(_ref7, 2),
            fieldId = _ref8[0],
            fieldDef = _ref8[1];

        return [fieldDef.field, Object.assign({ id: fieldId }, fieldDef)];
    }))];
}));

function encodeRecordHeader(isDef, type) {
    var ar = new ArrayBuffer(1);
    var msg = isDef ? 1 << 6 : 0; //6th bit swapped for def message
    new DataView(ar).setUint8(0, msg + type, true);
    return ar;
}

function encodeRecordDefContent(msgNum, len) {
    var ar = new ArrayBuffer(5);
    var dv = new DataView(ar);
    dv.setUint8(0, 0, true);
    dv.setUint8(1, 0, true);
    dv.setUint16(2, msgNum, true);
    dv.setUint8(4, len, true);
    return ar;
}

function baseTypeAndSizeByName(typeName, values) {
    var size = 0;

    switch (typeName) {
        case 'sint8':
        case 'uint8':
        case 'uint8z':
        case 'byte':
            size = 1;
            break;
        case 'sint16':
        case 'uint16':
        case 'uint16z':
            size = 2;
            break;
        case 'sint32':
        case 'uint32':
        case 'float32':
        case 'uint32z':
            size = 4;
            break;
        case 'float64':
        case 'sint64':
        case 'uint64':
        case 'uint64z':
            size = 8;
            break;
        case 'string':
            var enc = new TextEncoder();
            size = values.reduce(function (acc, val) {
                return Math.max(acc, enc.encode(val).length);
            }, 0);
            break;
        default:
            throw Error('Unknown size for type ' + typeName);
    }

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = Object.keys(_fit.FIT.types.fit_base_type)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var id = _step.value;

            if (_fit.FIT.types.fit_base_type[id] === typeName) {
                return { id: id, size: size };
            }
        }
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

    throw Error('Unknown type ' + typeName);
}

function encodeFieldDefs(fields, values) {
    var ar = new ArrayBuffer(3 * fields.length);
    var dv = new DataView(ar);

    var _loop = function _loop(i) {
        var field = fields[i];
        var allVals = values.map(function (row) {
            return row[i];
        }); //results in undefined
        var typeIdAndSize = baseTypeAndSizeByName(nativeType(field.type), allVals);
        dv.setUint8(i * 3, field.id, true);
        dv.setUint8(i * 3 + 1, typeIdAndSize.size, true);
        dv.setUint8(i * 3 + 2, typeIdAndSize.id, true);
    };

    for (var i = 0; i < fields.length; i++) {
        _loop(i);
    }

    return ar;
}

function nativeType(type) {
    switch (type) {
        case 'date_time':
            return "uint32";
        default:
            if (_fit.FIT.types[type]) {
                //if there are keys > 255, we need 2 bytes
                if (Object.keys(_fit.FIT.types[type]).reduce(function (acc, v) {
                    return Math.max(acc, v);
                }, 0) > 255) {
                    return "uint16";
                } else {
                    return "uint8";
                }
            }
            return type;
    }
}

function encodeFieldValues(fieldAndValues) {
    var fieldAndNativeAndValues = fieldAndValues.map(function (_ref9) {
        var _ref10 = _slicedToArray(_ref9, 2),
            f = _ref10[0],
            v = _ref10[1];

        return [f, baseTypeAndSizeByName(nativeType(f.type), [v]), v];
    });

    var ar = new ArrayBuffer(fieldAndNativeAndValues.reduce(function (prev, curr) {
        return prev + curr[1].size;
    }, 0));
    var pos = 0;
    var dv = new DataView(ar);

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = fieldAndNativeAndValues[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _step2$value = _slicedToArray(_step2.value, 3),
                field = _step2$value[0],
                native = _step2$value[1],
                value = _step2$value[2];

            var fieldNativeType = nativeType(field.type);
            writeNative(fieldNativeType, nativeValue(value, fieldNativeType, field), dv, pos);
            pos += native.size;
        }
    } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
            }
        } finally {
            if (_didIteratorError2) {
                throw _iteratorError2;
            }
        }
    }

    return ar;
}

function writeNative(typeName, value, view) {
    var offset = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

    switch (typeName) {
        case 'sint8':
            view.setInt8(offset, value, true);
            break;
        case 'uint8':
        case 'uint8z':
        case 'byte':
            view.setUint8(offset, value, true);
            break;
        case 'sint16':
            view.setInt16(offset, value, true);
            break;
        case 'uint16':
        case 'uint16z':
            view.setUint16(offset, value, true);
            break;
        case 'sint32':
            view.setInt32(offset, value, true);
            break;
        case 'uint32':
        case 'uint32z':
            view.setUint32(offset, value, true);
            break;
        case 'float32':
            view.setFloat32(offset, value, true);
            break;
        case 'sint64':
            view.setInt64(offset, value, true);
            break;
        case 'uint64':
        case 'uint64z':
            view.setUint64(offset, value, true);
            break;
        case 'float64':
            view.setFloat64(offset, value, true);
            break;
        case 'string':
            var utf8array = new TextEncoder().encode(value);
            new Uint8Array(view.buffer).set(new Uint8Array(utf8array));
            break;
        default:
            throw Error('Unknown type ' + typeName);
    }
}

function nativeValue(value, nativeType, fieldDef) {
    if (value === undefined) {
        return invalidValue(nativeType);
    }

    if (fieldDef.type === "date_time") {
        if (typeof value === "Date") {
            value = value.getTime();
        }

        if (value < 10000000000) {
            //already in garmin format
            return value;
        } else {
            //assume raw JS timestamp
            return (value - 631065600000) / 1000;
        }
    }

    if (typeof value === "string" && _fit.FIT.types[fieldDef.type]) {
        //enum; find the key for the provided value
        var found = Object.entries(_fit.FIT.types[fieldDef.type]).find(function (i) {
            return i[1] === value;
        });

        if (found) {
            return found[0];
        } else {
            throw 'No value of ' + value + ' found for type ' + fieldDef.type;
        }
    }

    switch (nativeType) {
        case 'sint32':
        case 'sint16':
            return value * _fit.FIT.scConst;
        case 'uint8':
        case 'uint32':
        case 'uint16':
            if (fieldDef.scale) {
                return value * fieldDef.scale - fieldDef.offset;
            }
        default:
            return value;
    }
}

function encodeDefinitionAndData(messageTypeName, fieldNames, values, localRecordId) {
    var data = [];

    var messageDef = messageDefByName[messageTypeName] || function () {
        throw 'No message def found with name ' + messageTypeName;
    };
    var fieldDefs = fieldNames.map(function (n) {
        var def = fieldDefByFieldNameByMessageName[messageTypeName][n];
        if (def === undefined) {
            throw Error('No field def found with name ' + n + ' for message type ' + messageTypeName);
        }
        return def;
    });

    //definition record
    data.push(encodeRecordHeader(true, localRecordId));
    data.push(encodeRecordDefContent(messageDef.id, fieldDefs.length));
    data.push(encodeFieldDefs(fieldDefs, values));
    //data records
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
        for (var _iterator3 = values[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var valuesArray = _step3.value;

            data.push(encodeRecordHeader(false, localRecordId));
            data.push(encodeFieldValues(valuesArray.map(function (v, i) {
                return [fieldDefs[i], v];
            })));
        }
    } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
                _iterator3.return();
            }
        } finally {
            if (_didIteratorError3) {
                throw _iteratorError3;
            }
        }
    }

    return data;
}

function encodeFile(fitObj) {

    var messageNames = Object.keys(fitObj);
    var data = [];

    //ensure required messages
    if (!messageNames.includes(_fit.FIT.messages[0].name)) {
        throw Error('No message of type ' + _fit.FIT.messages[0].name + ' found');
    }

    var localRecordId = 0;

    //encode each message by type
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
        for (var _iterator4 = messageNames[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var messageName = _step4.value;

            var messages = null;

            if (messageDefByName[messageName]) {
                //singular
                messages = [fitObj[messageName]];
            } else if (messageName.endsWith('s') && messageDefByName[messageName.slice(0, -1)]) {
                //multiple
                messages = fitObj[messageName];
                messageName = messageName.slice(0, -1);
            } else if (fitObj[messageName] === undefined) {
                continue;
            } else {
                throw Error('Unknown message type ' + messageName);
            }

            data = data.concat(encodeMessagesOfType(messageName, messages, localRecordId));
            localRecordId++;
        }
    } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
                _iterator4.return();
            }
        } finally {
            if (_didIteratorError4) {
                throw _iteratorError4;
            }
        }
    }

    return data;
}

function invalidValue(type) {
    switch (type) {
        case 'enum':
            return 0xFF;
        case 'sint8':
            return 0x7F;
        case 'uint8':
            return 0xFF;
        case 'sint16':
            return 0x7FFF;
        case 'uint16':
            return 0xFFFF;
        case 'sint32':
            return 0x7FFFFFFF;
        case 'uint32':
            return 0xFFFFFFFF;
        case 'string':
            return 0x00;
        case 'float32':
            return 0xFFFFFFFF;
        case 'float64':
            return 0xFFFFFFFFFFFFFFFF;
        case 'uint8z':
            return 0x00;
        case 'uint16z':
            return 0x0000;
        case 'uint32z':
            return 0x000000;
        case 'byte':
            return 0xFF;
        case 'sint64':
            return 0x7FFFFFFFFFFFFFFF;
        case 'uint64':
            return 0xFFFFFFFFFFFFFFFF;
        case 'uint64z':
            return 0x0000000000000000;
        default:
            throw Error('Unknown type ' + type);
    }
}

function encodeMessagesOfType(messageName, messages, localRecordId) {
    var allFieldNames = Array.from(messages.reduce(function (prev, curr) {
        return new Set([].concat(_toConsumableArray(prev), _toConsumableArray(Object.keys(curr))));
    }, [])).filter(function (f) {
        return filterField(messageName, f);
    });

    var allFieldDefs = allFieldNames.map(function (n) {
        var def = fieldDefByFieldNameByMessageName[messageName][n];
        if (!def) {
            throw Error('No field named ' + n + ' for message ' + messageName);
        }
        return def;
    }).filter(function (x) {
        return x !== null;
    });

    var valuesGrid = messages.map(function (message) {
        return allFieldDefs.map(function (def) {
            return def.field in message ? message[def.field] : invalidValue(nativeType(def.type));
        });
    });

    return encodeDefinitionAndData(messageName, allFieldNames, valuesGrid, localRecordId);
}

function filterField(messageName, fieldName) {
    if (messageName === 'record' && fieldName === "elapsed_time") {
        return false;
    }

    return true;
}