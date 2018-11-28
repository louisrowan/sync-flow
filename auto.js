'use strict';

const assert = require( 'assert' );
const fs = require( 'fs' );
const path = require( 'path' );

const step = require( './step' );

let readline;
let rl;
// if ( process.platform === 'win32' ) {

//   readline = require( 'readline' );
//   rl = readline.createInterface( {
//     input: process.stdin,
//     output: process.stdout
//   } );

//   rl.on( 'SIGINT', () => {

//     process.emit( 'SIGINT' );
//   } );

//   console.log( rl )
// }


function auto( taskObj, options, cb ) {

  new _auto( taskObj, options, cb );
}


function _auto( taskObj, options, cb ) {

  this.taskObj = taskObj;
  this.taskNames = Object.keys( this.taskObj );
  this.options = options;
  this.cb = cb;
  this.unresolved = [];
  this.tmpFile = `.${ Math.random() }`;
  this.tmpFileDeleted = false;
  this.tmpFilePath = path.resolve( __dirname, this.tmpFile );
  this.tmpFileContents = '';
  this.startTime = Date.now();
  this.meta = {};

  this.configureArgs();
}


_auto.prototype.configureArgs = function() {

  if ( !this.cb ) {
    this.cb = this.options;
    this.options = {};
  }

  this.validate();
};


_auto.prototype.validate = function() {

  this.taskNames.forEach( taskName => {

    const taskOrArray = this.taskObj[ taskName ];

    if ( Array.isArray( taskOrArray ) ) {

      let funcCount = 0;
      taskOrArray.forEach( dependencyName => {

        if ( typeof dependencyName === 'string' ) {
          assert( dependencyName !== taskName, `circular depency given for task ${ taskName }` );
          assert( this.taskNames.includes( dependencyName ), `unknown dependency ${ dependencyName } given for task ${ taskName }` );
        }

        else {
          assert( typeof dependencyName === 'function', `Invalid dependency type ${ typeof dependencyName } given for task ${ taskName }` );
          assert( ++funcCount === 1, `Multiple functions passed for task ${ taskName }` );
        }

      } );
    }

    else {
      assert( typeof taskOrArray === 'function', `Invalid type ${ typeof taskOrArray } given for task ${ taskName }` );
    }

  } );

  this.addDependencies();
};


_auto.prototype.addDependencies = function() {

  this.taskNames.forEach( name => {

    const value = this.taskObj[ name ];

    if ( typeof value === 'function' ) {
      this.unresolved.push( new step( {
        name,
        func: value,
        dependencies: [],
        listeners: []
      } ) );
    }

    else {

      const dependencies = [];
      let func;

      value.forEach( element => {

        if ( typeof element === 'string' ) {
          dependencies.push( element );
        }

        else {
          func = element;
        }

      } );

      this.unresolved.push( new step( {
        name,
        func: func,
        dependencies,
        listeners: []
      } ) );
    }

  } );

  this.addListeners();
};


_auto.prototype.addListeners = function() {

  this.unresolved.forEach( step => {

    step.dependencies.forEach( dependencyName => {

      const dependency = this.unresolved.find( s => s.name === dependencyName );
      dependency.listeners.push( step.name );
    } );

  } );

  this.writeToFile();
};


_auto.prototype.writeToFile = function() {

  let functionText = '';
  let processText =
  `const input = JSON.parse( process.argv[ 2 ]);

process.on( 'message', message => {

  const cb = ( err, result ) => {

    process.send( [ err, result ] );
  };

  input.cb = cb;
`;


  this.unresolved.forEach( step => {

    functionText += `${ step.func.toString() };

`;

    processText += `
  if ( message === '${ step.name }' ) {

    ${ step.func.name }( input );
  }`;

  } );

  processText += `;
} );`

  this.tmpFileContents = functionText + processText;

  fs.writeFileSync( path.resolve( __dirname, this.tmpFile ), this.tmpFileContents );

  this.addFileDeletionHooks();
};


_auto.prototype.addFileDeletionHooks = function() {

  process.on( 'exit', () => {

    this.deleteTmpFile();
  } );

  process.on( 'SIGINT', () => {

    process.exit();
  } );

  this._runAll();
};


_auto.prototype._runAll = function() {

  const results = {};
  const taskMeta = {};
  const runFunctions = [];
  const unresolved = this.unresolved;
  const tmpFilePath = this.tmpFilePath;
  const _finish = this.finish.bind( this );
  let abort = false;

  function callback ( err, result, _meta ) {

    const step = this;
    const idx = unresolved.find( _s => _s.name === step.name );
    unresolved.splice( idx, 1 );

    if ( err ) {
      abort = true;
      return _finish( err, undefined, taskMeta );
    }

    results[ step.name ] = result;
    taskMeta[ step.name ] = _meta;

    runUnresolved();
  };

  function runUnresolved() {

    if ( !unresolved.length ) {
      return _finish( null, results, taskMeta );
    }

    if ( abort ) {
      return;
    }

    for ( let idx = 0; idx < unresolved.length; ++idx ) {

      const step = unresolved[ idx ];

      if ( runFunctions.includes( step.name ) ) {
        break;
      }

      let canRun = true;

      step.dependencies.forEach( dependencyName => {

        if ( unresolved.find( _s => _s.name === dependencyName ) ) {
          canRun = false;
        }

      } );

      if ( canRun ) {
        runFunctions.push( step.name );
        step.run( tmpFilePath, results, callback );
      }

    }
  }

  runUnresolved();
};


_auto.prototype.finish = function( err, results, taskMeta ) {

  this.meta.tasks = taskMeta;
  this.meta.duration = Date.now() - this.startTime;

  if ( rl ) {
    // rl.close();
  }
  this.deleteTmpFile();
  this.cb( err, results, this.meta );
};


_auto.prototype.deleteTmpFile = function() {

  if ( this.tmpFileDeleted ) {
    return;
  }

  try {
    fs.unlinkSync( this.tmpFilePath );
    this.tmpFileDeleted = true;
  }
  catch( err ) {
    console.log( 'unlink err', err );
  }
};


module.exports = auto;
