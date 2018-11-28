'use strict';

const assert = require( 'assert' );
const lab = require( 'lab' );
const { it, describe } = exports.lab = require( 'lab' ).script();

const sync = require( '../' );


const internals = {};



internals.return2after5 = function return2after5( args ) {

  const start = Date.now();
  while ( true ) {
    if ( Date.now() - 5000 > start ) break;
  }
  return args.cb( null, 2 );
}

internals.return20after4 = function return20after4( args ) {

  const start = Date.now();
  while ( true ) {
    if ( Date.now() - 4000 > start ) break;
  }
  return args.cb( null, 20 );
}

internals.returnInputPlusInputAfter2 = function returnInputPlusInputAfter2( args ) {

  const start = Date.now();
  while ( true ) {
    if ( Date.now() - 2000 > start ) break;
  }
  return args.cb( null, args.data.first + args.data.second );
}


describe( 'test', () => {

  it( 'test', ( done ) => {

    sync.auto( {
      first: internals.return2after5,
      second: internals.return20after4,
      third: [ 'first', 'second', internals.returnInputPlusInputAfter2 ]
    }, ( err, result, meta ) => {

      console.log( 'here and err', err )
      console.log( 'here and result', result )
      console.log( 'here and meta', meta )

      done();
    } );
  } )
} )