import { FIT } from './fit';

const fileTypesByName = Object.fromEntries(Object.entries(FIT.types.file).map(([k, v]) => [v, parseInt(k)]));

const messageDefByName = Object.fromEntries(Object.entries(FIT.messages).
    map(([k, v]) => [v.name, Object.assign({id: k}, v)]));

const fieldDefByFieldNameByMessageName = Object.fromEntries(
    Object.entries(FIT.messages).map(([messageId, messageDef]) => [
        messageDef.name, Object.fromEntries(Object.entries(messageDef).map(([fieldId, fieldDef]) => [
            fieldDef.field, Object.assign({id: fieldId}, fieldDef)
        ]))
    ])
)

function encodeRecordHeader(isDef, type) {
    let ar = new ArrayBuffer(1);
    let msg = isDef ? 1 << 6 : 0; //6th bit swapped for def message
    new DataView(ar).setUint8(0, msg + type, true)
    return ar;
}

function encodeRecordDefContent(msgNum, len) {
    let ar = new ArrayBuffer(5);
    let dv = new DataView(ar);
    dv.setUint8(0, 0, true);
    dv.setUint8(1, 0, true);
    dv.setUint16(2, msgNum, true);
    dv.setUint8(4, len, true);
    return ar;
}

function baseTypeAndSizeByName(typeName, values) {
    let size = 0;

    switch(typeName) {
        case 'enum':
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
            let enc = new TextEncoder();
            size = values.reduce((acc, val) => Math.max(acc, enc.encode(val).length), 0);
            break;
        default:
            throw Error(`Unknown size for type ${typeName}`);
    }

    for(let id of Object.keys(FIT.types.fit_base_type)) {
        if(FIT.types.fit_base_type[id] === typeName) {
            return { id: id, size: size };
        }
    }

    throw Error(`Unknown type ${typeName}`);
}

function encodeFieldDefs(fields, values) {
    let ar = new ArrayBuffer(3 * fields.length);
    let dv = new DataView(ar);
    
    for(let i = 0; i < fields.length; i++) {
        let field = fields[i];
        let allVals = values.map(row => row[i]); //results in undefined
        let typeIdAndSize = baseTypeAndSizeByName(nativeType(field.type), allVals);
        dv.setUint8(i*3, field.id, true);
        dv.setUint8(i*3+1, typeIdAndSize.size, true);
        dv.setUint8(i*3+2, typeIdAndSize.id, true);
    }

    return ar;
}

function nativeType(type) {
    switch (type) {
        case 'date_time':
            return "uint32";
        default:
            if (FIT.types[type]) {
                return "enum";
            }
            return type;
    }
}

function encodeFieldValues(fieldAndValues) {
    let fieldAndNativeAndValues = fieldAndValues.map(([f,v]) => [f, baseTypeAndSizeByName(nativeType(f.type), [v]), v]);

    let ar = new ArrayBuffer(fieldAndNativeAndValues.reduce((prev, curr) => prev + curr[1].size, 0));
    let pos = 0;
    let dv = new DataView(ar);

    for(let [field, native, value] of fieldAndNativeAndValues) {
        let fieldNativeType = nativeType(field.type);
        writeNative(fieldNativeType, nativeValue(value, fieldNativeType, field), dv, pos);
        pos += native.size;
    }

    return ar;
}

function writeNative(typeName, value, view, offset = 0) {
    switch(typeName) {
        case 'sint8':
            view.setInt8(offset, value, true);
            break;
        case 'uint8':
        case 'uint8z':
        case 'byte':
        case 'enum':
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
            let utf8array = new TextEncoder().encode(value);
            new Uint8Array(view.buffer).set(new Uint8Array(utf8array));
            break;
        default:
            throw Error(`Unknown type ${typeName}`);
    }
}

function nativeValue(value, nativeType, fieldDef) {
    if(value === undefined) {
        return invalidValue(nativeType);
    }

    if(fieldDef.type === "date_time") {
        if(typeof value === "Date") {
            value = value.getTime();
        }

        if(value < 10000000000) { //already in garmin format
            return value;
        } else { //assume raw JS timestamp
            return (value - 631065600000) / 1000      
        }
    }

    if (typeof(value) === "string" && FIT.types[fieldDef.type]) {
        //enum; find the key for the provided value
        let found = Object.entries(FIT.types[fieldDef.type]).find(i => i[1] === value);
        
        if(found) {
            return found[0];
        } else {
            throw `No value of ${value} found for type ${fieldDef.type}`;
        }
    }

    switch (nativeType) {      
        case 'sint32':
        case 'sint16':
            return value * FIT.scConst;
        case 'uint8':
        case 'uint32':
        case 'uint16':
            if(fieldDef.scale) {
                return (value * fieldDef.scale) - fieldDef.offset;
            }
        default:
            return value;
    }
}


function encodeDefinitionAndData(messageTypeName, fieldNames, values, localRecordId) {
    let data = [];

    let messageDef = messageDefByName[messageTypeName] || (() => {throw `No message def found with name ${messageTypeName}`});
    let fieldDefs = fieldNames.map(n => {
        let def = fieldDefByFieldNameByMessageName[messageTypeName][n]
        if(def === undefined){
            throw Error(`No field def found with name ${n} for message type ${messageTypeName}`);
        }
        return def;
    });

    //definition record
    data.push(encodeRecordHeader(true, localRecordId));
    data.push(encodeRecordDefContent(messageDef.id, fieldDefs.length));
    data.push(encodeFieldDefs(fieldDefs, values));
    //data records
    for(let valuesArray of values) {
        data.push(encodeRecordHeader(false, localRecordId));
        data.push(encodeFieldValues(valuesArray.map((v, i) => [fieldDefs[i], v])))
    }

    return data;
}

export function encodeFile(fitObj) {

    let messageNames = Object.keys(fitObj);
    let data = [];

    //ensure required messages
    if(!messageNames.includes(FIT.messages[0].name)) {
        throw Error(`No message of type ${FIT.messages[0].name} found`);
    }

    let localRecordId = 0;

    //encode each message by type
    for(let messageName of messageNames) {
        let messages = null;
        
        if(messageDefByName[messageName]) { //singular
            messages = [fitObj[messageName]];
        } else if (messageName.endsWith('s') && messageDefByName[messageName.slice(0, -1)]) { //multiple
            messages = fitObj[messageName];
            messageName = messageName.slice(0, -1);
        } else if(fitObj[messageName] === undefined) {
            continue;
        } else {
            throw Error(`Unknown message type ${messageName}`);
        }

        data = data.concat(encodeMessagesOfType(messageName, messages, localRecordId));
        localRecordId++;
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
            throw Error(`Unknown type ${type}`);
    }
}

function encodeMessagesOfType(messageName, messages, localRecordId) {
    let allFieldNames = Array.from(
        messages.reduce((prev, curr) => new Set([...prev, ...Object.keys(curr)]), [])
        ).filter(f => filterField(messageName, f));
    
    let allFieldDefs = allFieldNames.map(n => {
        let def = fieldDefByFieldNameByMessageName[messageName][n];
        if(!def) {
            throw Error(`No field named ${n} for message ${messageName}`);
        }
        return def;
    }).filter(x => x !== null);

    let valuesGrid = messages.map(message => 
        allFieldDefs.map(def => 
            def.field in message ? message[def.field] : invalidValue(nativeType(def.type)))
        );

    return encodeDefinitionAndData(messageName, allFieldNames, valuesGrid, localRecordId);
}

function filterField(messageName, fieldName) {
    if(messageName === 'record' && fieldName === "elapsed_time") {
        return false;
    }

    return true;
}