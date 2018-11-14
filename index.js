'use strict';


const fs = require('fs');
const child_process = require('child_process')
const path = require('path');

// obj = {
//   first: first(),
//   second: second(),
//   third: ['first', 'second', third()]
// }


function auto (obj, options, cb) {
  new _auto(obj, options, cb)
}


function _auto (obj, options, cb) {

  this.obj = obj;
  this.options = options;
  this.cb = cb;
  this.unresolved = [];
  this.validate();

}


_auto.prototype.validate = function() {

  if (!this.cb) {
    this.cb = this.options;
    this.options = {}
  }

  this.format();
}


_auto.prototype.format = function() {

  Object.keys(this.obj).forEach(name => {

    const value = this.obj[name];
    if (typeof value === 'function') {
      this.unresolved.push({
        name,
        function: value,
        dependencies: []
      });
    }
    else {
      let funcCount = 0;
      let func;
      const dependencies = [];
      value.forEach(element => {
        if (typeof element === 'string') {
          dependencies.push(element)
        }
        else if (typeof element === 'function') {
          if (funcCount > 0) {
            throw new Error('too many functions passed for key', key)
          }
          func = element;
          ++funcCount;
        }
        else {
          throw new Error('invalid type passed for key', key);
        }
      });
      this.unresolved.push({
        name,
        function: func,
        dependencies
      });
    }
  });


  this.run()

}

_auto.prototype.run = function() {

  console.log('in run')

  const results = {};
  const resolved = [];


  const findUnresolved = () => {

    this.unresolved.forEach((step, i) => {

      let depToWaitOn = false;
      step.dependencies.forEach(dep => {
        if (resolved.indexOf(dep) < 0) {
          depToWaitOn = true;
        }
      });

      if (!depToWaitOn) {

        const callback = (err, result) => {

          this.unresolved.splice(i, 1)
          console.log('unresolved is now', this.unresolved)
          resolved.push(step.name)
          if (!err) {
            results[step.name] = result;

            if (!this.unresolved.length) {
              return this.cb(null, results);
            }

            findUnresolved()
          }
          if (err) {
            return this.cb(err)
          }
        }

        const data = {};
        step.dependencies.forEach(dep => {
          data[dep] = results[dep]
        })

        runFunc(step, data, callback)

      }
    });

  }

  findUnresolved()

}


const runFunc = (step, data, callback) => {


  const filePath = `.${step.name}`;


  const contents = `${step.function.toString()}

  const input = JSON.parse(process.argv[2])

  process.on('message', message => {

    const cb = (err, result) => {

      process.send([err, result])
    }

    input.cb = cb;
    ${step.function.name}(input)
  });`


  fs.writeFileSync(path.resolve(__dirname, filePath), contents);

    const input = {
      data: data
    }



    const str = JSON.stringify(input)

    console.log('call compute for', filePath, 'with args', str)


    const compute = child_process.fork(filePath, [str]);
    compute.send('start');

    compute.on('message', result => {
      const err = result[0];
      const res = result[1]
      fs.unlinkSync(filePath);
      console.log()
      console.log('Long computation err', err)
        console.log('and result', res)

        callback(err, res)
    });




  // step.function({
  //   data,
  //   cb: callback
  // })
}












module.exports.auto = auto;