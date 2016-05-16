# easy-fit

> Parse your .FIT files easily, directly from JS.
> Written in ES6.


## Install

```
$ npm install easy-fit
```

## How to use

See in [examples](./examples) folder:

```javascript
var EasyFit = require('./../dist/easy-fit.js').default;
var fs = require('fs');

fs.readFile('./example.fit', function (err, content) {
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

## API Documentation
### new EasyFit(Object _options_)
Needed to create a new instance. _options_ is optional, and is used to customize the returned JSON.

Allowed properties :
- `mode`: **String**
- `lengthUnit`: **String**
- `temperatureUnit`: **String**
- `speedUnit`: **String**
- `force`: **Boolean**
- `elapsedRecordField`: **Boolean**

### easyFit.parse(Buffer _file_, Function _callback_)
_callback_ receives two arguments, the first as a error String, and the second as Object, result of parsing.

## License

MIT license; see [LICENSE](./LICENSE).

(c) 2016 by Pierre Jacquier
