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
        done();
      });
    });
  });

});
