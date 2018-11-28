'use strict';

const child_process = require( 'child_process' );


function step( { name, func, dependencies, listeners } ) {

  this.name = name;
  this.func = func;
  this.dependencies = dependencies;
  this.listeners = listeners;
}


step.prototype.run = function( filePath, results, cb ) {

  const strResults = JSON.stringify( { data: results } );

  const compute = child_process.fork( filePath, [ strResults ] );

  compute.on( 'message', result => {

     if ( process.platform === 'win32' ) {
      child_process.spawn( 'taskkill', ['/pid', compute.pid, '/f', '/t'] );
    }
    else {
      compute.disconnect();
    }

    const [ err, res ] = result;
    const duration = Date.now() - startTime;
    const _meta = { duration };

    cb.call( this, err, res, _meta );
  } );

  const startTime = Date.now();

  compute.send( this.name );
};


module.exports = step;
