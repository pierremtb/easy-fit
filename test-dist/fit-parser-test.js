'use strict';

var _fitParser = require('../dist/fit-parser.js');

var _fitParser2 = _interopRequireDefault(_fitParser);

var _chai = require('chai');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('fit parser tests', function () {
    it('expects to retrieve a FIT object', function (done) {
        this.timeout(5000);
        var fitParser = new _fitParser2.default({ force: true });
        _fs2.default.readFile('./test/test.fit', function (err, buffer) {
            if (err) {
                throw "Unable to read file";
            }
            fitParser.parse(buffer, function (fitError, fitObject) {
                if (fitError) {
                    throw "Error parsing";
                }
                (0, _chai.expect)(fitObject).to.be.a('object');
                (0, _chai.expect)(fitObject).to.have.property('sessions');
                done();
            });
        });
    });

    it('expects longitude to be in the range -180 to +180', function (done) {
        this.timeout(5000);
        var fitParser = new _fitParser2.default({ force: true });
        _fs2.default.readFile('./test/test2.fit', function (err, buffer) {
            if (err) {
                throw "Unable to read file";
            }
            fitParser.parse(buffer, function (fitError, fitObject) {
                if (fitError) {
                    throw "Error parsing";
                }
                (0, _chai.expect)(fitObject).to.have.property('records');
                (0, _chai.expect)(fitObject.records.map(function (r) {
                    return r.position_long;
                }).filter(function (l) {
                    return l > 180 || l < -180;
                })).to.be.empty;

                done();
            });
        });
    });

    it('expects fit with developer data to be parsed', function (done) {
        this.timeout(5000);
        var fitParser = new _fitParser2.default({ force: true });
        _fs2.default.readFile('./test/running-with-developer-data.fit', function (err, buffer) {
            if (err) {
                throw "Unable to read file";
            }
            fitParser.parse(buffer, function (fitError, fitObject) {
                if (fitError) {
                    throw "Error parsing";
                }
                (0, _chai.expect)(fitObject).to.have.property('records');
                (0, _chai.expect)(fitObject.records[0]).to.have.property('Ground Time');
                (0, _chai.expect)(fitObject.records[0]).to.have.property('Vertical Oscillation');
                (0, _chai.expect)(fitObject.records[0]).to.have.property('Elevation');

                done();
            });
        });
    });
});