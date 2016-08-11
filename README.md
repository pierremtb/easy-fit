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
// Require the module
var EasyFit = require('./../dist/easy-fit.js').default;

// Read a .FIT file
var fs = require('fs');
fs.readFile('./example.fit', function (err, content) {

  // Create a EasyFit instance (options argument is optional)
  var easyFit = new EasyFit({
    force: true,
    speedUnit: 'km/h',
    lengthUnit: 'km',
    temperatureUnit: 'kelvin',
    elapsedRecordField: true,
    mode: 'cascade',
  });
  
  // Parse your file
  easyFit.parse(content, function (error, data) {
  
    // Handle result of parse method
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
Needed to create a new instance. _options_ is optional, and is used to customize the returned object.

Allowed properties :
- `mode`: String
  - `cascade`: Returned object is organized as a tree, eg. each lap contains a `records` fields, that is an array of its records (**default**)
  - `list`: Returned object is organized as lists of sessions, laps, records, etc..., without parent-child relation
  - `both`: A mix of the two other modes, eg. `records` are available inside the root field as well as inside each laps
- `lengthUnit`: String
  - `m`: Lengths are in meters (**default**)
  - `km`: Lengths are in kilometers
  - `mi`: Lengths are in miles
- `temperatureUnit`: String
  - `celsius`:Temperatures are in °C (**default**)
  - `kelvin`: Temperatures are in °K
  - `farhenheit`: Temperatures are in °F
- `speedUnit`: String
  - `m/s`: Speeds are in meters per seconds (**default**)
  - `km/h`: Speeds are in kilometers per hour
  - `mph`: Speeds are in miles per hour
- `force`: Boolean
  - `true`: Continues even if they are errors (**default for now**)
  - `false`: Stops if an error occurs
- `elapsedRecordField`: Boolean
  - `true`: Includes a `elapsed_time` field inside each `record` field, containing the elapsed time in seconds since the first record (**default**)
  - `false`

### easyFit.parse(Buffer _file_, Function _callback_)
_callback_ receives two arguments, the first as a error String, and the second as Object, result of parsing.

## Contributors

Big thanks to [Mikael Lofjärd](https://github.com/mlofjard) for [his early prototype](https://github.com/mlofjard/jsonfit).
See [CONTRIBUTORS](./CONTRIBUTORS.md).

## License

MIT license; see [LICENSE](./LICENSE).

(c) 2016 by Pierre Jacquier
