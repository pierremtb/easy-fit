"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var mapDataIntoLap = exports.mapDataIntoLap = function mapDataIntoLap(inputLaps, lapKey, data) {
  var laps = [].concat(_toConsumableArray(inputLaps));
  var index = 0;
  for (var i = 0; i < laps.length; i++) {
    var lap = laps[i];
    var nextLap = laps[i + 1];
    var tempData = [];
    var lapStartTime = new Date(lap.start_time).getTime();
    var nextLapStartTime = nextLap ? new Date(nextLap.start_time).getTime() : null;
    for (var j = index; j < data.length; j++) {
      var row = data[j];
      if (nextLap) {
        var timestamp = new Date(row.timestamp).getTime();
        if (lapStartTime <= timestamp && nextLapStartTime > timestamp) {
          tempData.push(row);
        } else if (nextLapStartTime <= timestamp) {
          index = j;
          break;
        }
      } else {
        tempData.push(row);
      }
    }

    if (!laps[i][lapKey]) {
      laps[i][lapKey] = tempData;
    }
  }

  return laps;
};

var mapDataIntoSession = exports.mapDataIntoSession = function mapDataIntoSession(inputSessions, laps) {
  var sessions = [].concat(_toConsumableArray(inputSessions));
  var lapIndex = 0;
  for (var i = 0; i < sessions.length; i++) {
    var session = sessions[i];
    var nextSession = sessions[i + 1];
    var tempLaps = [];
    var sessionStartTime = new Date(session.start_time).getTime();
    var nextSessionStartTime = nextSession ? new Date(nextSession.start_time).getTime() : null;
    for (var j = lapIndex; j < laps.length; j++) {
      var lap = laps[j];
      if (nextSession) {
        var lapStartTime = new Date(lap.start_time).getTime();
        if (sessionStartTime <= lapStartTime && nextSessionStartTime > lapStartTime) {
          tempLaps.push(lap);
        } else if (nextSessionStartTime <= lapStartTime) {
          lapIndex = j;
          break;
        }
      } else {
        tempLaps.push(lap);
      }
    }

    if (!sessions[i].laps) {
      sessions[i].laps = tempLaps;
    }
  }
  return sessions;
};