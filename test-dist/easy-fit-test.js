'use strict';

/* global it, describe, before, after */

var _easyFit = require('../dist/easy-fit.js');

var _easyFit2 = _interopRequireDefault(_easyFit);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('easyfit tests', function () {

  var easyFit = void 0;

  before(function () {
    return easyFit = _easyFit2.default;
  });

  after(function () {
    return easyFit = undefined;
  });
});