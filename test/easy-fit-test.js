'use strict';

/* global it, describe, before, after */

import EasyFit from '../dist/easy-fit.js';

describe('easyfit tests', () => {

  let easyFit;

  before(() => easyFit = EasyFit);

  after(() => easyFit = undefined);
});
