'use strict';

const sync = require('./');


function return2After5Seconds (args) {
  console.log('in return2', args)
  const start = Date.now();
  while (true) {
    if (Date.now() - 5000 > start) break;
  }
  return args.cb(null, 2);
}

function return20After4Seconds (args) {
  console.log('in return 20', args)
  const start = Date.now();
  while (true) {
    if (Date.now() - 4000 > start) break;
  }
  return args.cb(null, 20);
}

function returnInputPlus2Inputfter2Seconds (args) {
  console.log('in return input', args)
  const start = Date.now();
  while (true) {
    if (Date.now() - 2000 > start) break;
  }
  return args.cb(null, args.data.first + args.data.second);
}

// const start = Date.now()

// const first = return2After5Seconds()
// const second = return20After4Seconds()
// const answer = returnInputPlus2Inputfter2Seconds(first, second)

// const end = Date.now()
// console.log('answer', answer, 'after', (end - start)/1000, 'seconds')

const start = Date.now()

sync.auto({
  first: return2After5Seconds,
  second: return20After4Seconds,
  third: ['first', 'second', returnInputPlus2Inputfter2Seconds]
}, (err, result) => {

  console.log('in end and result', result)
  console.log('err is', err)
  console.log('time', Date.now() - start)
  process.exit()
})