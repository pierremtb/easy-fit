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
    for (var j = index; j < data.length; j++) {
      var row = data[j];
      if (nextLap) {
        if (lap.start_time <= row.timestamp.toISOString() && nextLap.start_time >= row.timestamp.toISOString()) {
          tempData.push(row);
        } else if (nextLap.start_time < row.timestamp.toISOString()) {
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
    for (var j = lapIndex; j < laps.length; j++) {
      var lap = laps[j];
      if (nextSession) {
        if (session.start_time <= lap.start_time && nextSession.start_time >= lap.start_time) {
          tempLaps.push(lap);
        } else if (nextSession.start_time < lap.start_time) {
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