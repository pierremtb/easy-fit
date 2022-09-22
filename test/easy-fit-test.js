import EasyFit from '../dist/easy-fit.js';
import { expect } from 'chai';
import fs from 'fs';

describe('easyfit tests', function () {
  it('expects to retrieve a FIT object', function(done) {
    this.timeout(5000);
    const easyFit = new EasyFit({ force: true });
    fs.readFile('./test/test.fit', (err, buffer) => {
      if (err) {
        throw "Unable to read file";
      }
      easyFit.parse(buffer, (fitError, fitObject) => {
        if (fitError) {
          throw "Error parsing";
        }
        expect(fitObject).to.be.a('object');
        expect(fitObject).to.have.property('sessions');
        easyFit.encode(fitObject);
        done();
      });
    });
  });

    it('expects longitude to be in the range -180 to +180', function(done) {
        this.timeout(5000);
        const easyFit = new EasyFit({ force: true });
        fs.readFile('./test/test2.fit', (err, buffer) => {
            if (err) {
                throw "Unable to read file";
            }
            easyFit.parse(buffer, (fitError, fitObject) => {
                if (fitError) {
                    throw "Error parsing";
                }
                expect(fitObject).to.have.property('records');
                expect(fitObject.records
                    .map(r => r.position_long)
                    .filter(l => (l>180 || l <-180)))
                    .to.be.empty;

                easyFit.encode(fitObject);
                done();
            });
        });
    });

    it('expects to create a FIT weight stream', function(done) {
      this.timeout(5000);
      const easyFit = new EasyFit({ force: true });

      let buffer = easyFit.encode({
        "file_id": {
          "time_created": new Date(),
          "type": "weight",
        },
        "weight_scales": [{
            timestamp: new Date(),
            weight: 87.3,
            percent_fat: 17,
            bone_mass: 3.6,
            muscle_mass: 68.9,
            metabolic_age: 28,
          }
        ]
      });

      easyFit.parse(buffer, (fitError, fitObject) => {
          if (fitError) {
              throw "Error parsing";
          }
          expect(fitObject).to.have.property('records');
          expect(fitObject.records
              .map(r => r.position_long)
              .filter(l => (l>180 || l <-180)))
              .to.be.empty;

          done();
      });
  });

});
