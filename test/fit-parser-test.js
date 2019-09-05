import FitParser from '../dist/fit-parser.js';
import { expect } from 'chai';
import fs from 'fs';

describe('fit parser tests', function () {
    it('expects to retrieve a FIT object', function (done) {
        this.timeout(5000);
        const fitParser = new FitParser({ force: true });
        fs.readFile('./test/test.fit', (err, buffer) => {
            if (err) {
                throw "Unable to read file";
            }
            fitParser.parse(buffer, (fitError, fitObject) => {
                if (fitError) {
                    throw "Error parsing";
                }
                expect(fitObject).to.be.a('object');
                expect(fitObject).to.have.property('sessions');
                done();
            });
        });
    });

    it('expects longitude to be in the range -180 to +180', function (done) {
        this.timeout(5000);
        const fitParser = new FitParser({ force: true });
        fs.readFile('./test/test2.fit', (err, buffer) => {
            if (err) {
                throw "Unable to read file";
            }
            fitParser.parse(buffer, (fitError, fitObject) => {
                if (fitError) {
                    throw "Error parsing";
                }
                expect(fitObject).to.have.property('records');
                expect(fitObject.records
                    .map(r => r.position_long)
                    .filter(l => (l > 180 || l < -180)))
                    .to.be.empty;

                done();
            });
        });
    });

    it('expects fit with developer data to be parsed', function (done) {
        this.timeout(5000);
        const fitParser = new FitParser({ force: true });
        fs.readFile('./test/running-with-developer-data.fit', (err, buffer) => {
            if (err) {
                throw "Unable to read file";
            }
            fitParser.parse(buffer, (fitError, fitObject) => {
                if (fitError) {
                    throw "Error parsing";
                }
                expect(fitObject).to.have.property('records');
                expect(fitObject.records[0]).to.have.property('Ground Time');
                expect(fitObject.records[0]).to.have.property('Vertical Oscillation');
                expect(fitObject.records[0]).to.have.property('Elevation');

                done();
            });
        });
    });




});
