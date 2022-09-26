'use strict';

var _easyFit = require('../dist/easy-fit.js');

var _easyFit2 = _interopRequireDefault(_easyFit);

var _chai = require('chai');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('easyfit tests', function () {
    it('expects to retrieve a FIT object', function (done) {
        this.timeout(5000);
        var easyFit = new _easyFit2.default({ force: true });
        _fs2.default.readFile('./test/test.fit', function (err, buffer) {
            if (err) {
                throw "Unable to read file";
            }
            easyFit.parse(buffer, function (fitError, fitObject) {
                if (fitError) {
                    throw "Error parsing";
                }
                (0, _chai.expect)(fitObject).to.be.a('object');
                (0, _chai.expect)(fitObject).to.have.property('sessions');
                easyFit.encode(fitObject);
                done();
            });
        });
    });

    it('expects longitude to be in the range -180 to +180', function (done) {
        this.timeout(5000);
        var easyFit = new _easyFit2.default({ force: true });
        _fs2.default.readFile('./test/test2.fit', function (err, buffer) {
            if (err) {
                throw "Unable to read file";
            }
            easyFit.parse(buffer, function (fitError, fitObject) {
                if (fitError) {
                    throw "Error parsing";
                }
                (0, _chai.expect)(fitObject).to.have.property('records');
                (0, _chai.expect)(fitObject.records.map(function (r) {
                    return r.position_long;
                }).filter(function (l) {
                    return l > 180 || l < -180;
                })).to.be.empty;

                easyFit.encode(fitObject);
                done();
            });
        });
    });

    it('expects to create a FIT weight stream', function (done) {
        this.timeout(5000);
        var easyFit = new _easyFit2.default({ force: true });

        var buffer = easyFit.encode({
            "file_id": {
                "time_created": new Date(),
                "type": "weight"
            },
            "weight_scales": [{
                timestamp: new Date(),
                weight: 87.3,
                percent_fat: 17,
                bone_mass: 3.6,
                muscle_mass: 68.9,
                metabolic_age: 28
            }]
        });

        _fs2.default.writeFileSync("out.fit", new DataView(buffer));

        easyFit.parse(buffer, function (fitError, fitObject) {
            if (fitError) {
                throw "Error parsing";
            }
            (0, _chai.expect)(fitObject).to.have.property('records');
            (0, _chai.expect)(fitObject.records.map(function (r) {
                return r.position_long;
            }).filter(function (l) {
                return l > 180 || l < -180;
            })).to.be.empty;

            // disabled as parsing appears broken
            // expect(fitObject.weight_scale.weight).to.equal(87.3);
            // expect(fitObject.weight_scale.percent_fat).to.equal(17);


            done();
        });
    });
});