export const mapDataIntoLap = (inputLaps, lapKey, data) => {
  const laps = JSON.parse(JSON.stringify(inputLaps));
  let index = 0;
  for (let i = 0; i < laps.length; i++) {
    const lap = laps[i];
    const nextLap = laps[i + 1];
    const tempData = [];
    for (let j = index; j < data.length; j++) {
      const row = data[j];
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

export const mapDataIntoSession = (inputSessions, inputLaps, lengths, records) => {
  const sessions = JSON.parse(JSON.stringify(inputSessions));
  let laps = JSON.parse(JSON.stringify(inputLaps));
  laps = mapDataIntoLap(laps, 'lengths', lengths);
  laps = mapDataIntoLap(laps, 'records', records);
  let lapIndex = 0;
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const nextSession = sessions[i + 1];
    const tempLaps = [];
    for (let j = lapIndex; j < laps.length; j++) {
      const lap = laps[j];
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
