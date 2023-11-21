'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var mapDataIntoLap = exports.mapDataIntoLap = function mapDataIntoLap(inputLaps, lapKey, data) {
  var laps = JSON.parse(JSON.stringify(inputLaps));
  var index = 0;
  for (var i = 0; i < laps.length; i++) {
    var lap = laps[i];
    var nextLap = laps[i + 1];
    var tempData = [];
    var lapStartTime = new Date(lap.startTime).getTime();
    var nextLapStartTime = nextLap ? new Date(nextLap.start_time).getTime() : null;
    for (var j = index; j < data.length; j++) {
      var row = data[j];
      if (nextLap) {
        var timestamp = new Date(row.timestamp).getTime();
        if (lapStartTime <= timestamp && nextLapStartTime >= timestamp) {
          tempData.push(row);
        } else if (nextLapStartTime < timestamp) {
          laps[i][lapKey] = tempData;
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

var mapDataIntoSession = exports.mapDataIntoSession = function mapDataIntoSession(inputSessions, inputLaps, lengths, records) {
  var sessions = JSON.parse(JSON.stringify(inputSessions));
  var laps = JSON.parse(JSON.stringify(inputLaps));
  laps = mapDataIntoLap(laps, 'lengths', lengths);
  laps = mapDataIntoLap(laps, 'records', records);
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
        if (sessionStartTime <= lapStartTime && nextSessionStartTime >= lapStartTime) {
          tempLaps.push(lap);
        } else if (nextSessionStartTime < lapStartTime) {
          sessions[i].laps = tempLaps;
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