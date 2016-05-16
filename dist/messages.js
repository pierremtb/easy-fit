'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFitMessage = getFitMessage;
exports.getFitMessageBaseType = getFitMessageBaseType;

var _fit = require('./fit');

function getFitMessage(messageNum) {
  return {
    name: (0, _fit.getMessageName)(messageNum),
    getAttributes: function getAttributes(fieldNum) {
      return (0, _fit.getFieldObject)(fieldNum, messageNum);
    }
  };
}

// TODO
function getFitMessageBaseType(foo) {
  return foo;
}