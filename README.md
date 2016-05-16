# easy-fit

> Parse your .FIT files easily, directly from JS.
> Written in ES6.


## Install

```
$ npm install easy-fit --save
```

## How to use

See in [examples](./examples) folder:

```javascript
var EasyFit = require('./../dist/easy-fit.js').default;
var fs = require('fs');

var file = process.argv[2];

fs.readFile(file, function (err, content) {
  var easyFit = new EasyFit({
    force: true,
    speedUnit: 'km/h',
    lengthUnit: 'km',
    temperatureUnit: 'kelvin',
    elapsedRecordField: true,
    mode: 'cascade',
  });

  easyFit.parse(content, function (error, data) {
    if (error) {
      console.log(error);
    } else {
      console.log(JSON.stringify(data));
    }
  });
});
```

## License

MIT license; see [LICENSE](./LICENSE).

(c) 2016 by Pierre Jacquier
