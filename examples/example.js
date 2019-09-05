var FitParser = require('./../dist/fit-parser.js').default;
var fs = require('fs');

var file = process.argv[2];

fs.readFile(file, function (err, content) {
  var fitParser = new FitParser({
    force: true,
    speedUnit: 'km/h',
    lengthUnit: 'm',
    temperatureUnit: 'celsius',
    elapsedRecordField: true,
    mode: 'list',
  });

  fitParser.parse(content, function (error, data) {
    if (error) {
      console.log(error);
    } else {
      console.log(JSON.stringify(data));
      //console.log(data.records[0]);
    }
  });
});
