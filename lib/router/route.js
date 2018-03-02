'use strict';

const LineEvents = require('../line.events');
const debug = require('debug')('line-messaging:router:route');
const flatten = require('array-flatten');
const Layer = require('./layer');

const slice = Array.prototype.slice;
const toString = Object.prototype.toString;

const events = LineEvents.keyword.concat(LineEvents.none);

module.exports = Route;

function Route (path) {
  this.path = path;
  this.stack = [];

  debug('new %o', path);

  this.events = {};
}

Route.prototype._handles_event = function (event) {
  var name = event.toLowerCase();
  return Boolean(this.events[name]);
}

Route.prototype.dispatch = function (msg, line, done) {
  var idx = 0;
  var stack = this.stack;
  if (stack.length === 0) {
    return done(new Error('No stack callback'));
  }

  let event = msg.event.toLowerCase();
  msg.route = this;
  next();

  function next (err) {
    if (err && err === 'route') {
      return done(new Error(err));
    }

    if (err && err === 'router') {
      return done(new Error(err));
    }

    var layer = stack[idx++];
    if (!layer) {
      return done(new Error('Not instance of Layer'));
    }

    if (layer.event && layer.event !== event) {
      return next(err);
    }

    if (err) {
      layer.handle_error(err, msg, line, next);
    } else {
      layer.handle_request(msg, line, next);
    }
  }
}

events.forEach(function (event) {
  Route.prototype[event] = function () {
    let handles = flatten(slice.call(arguments));

    for(let i in handles) {
      let handle = handles[i];

      if (typeof handle !== 'function') {
        let type = toString.call(handle);
        let msg = 'Route.' + method + '() requires a callback function but got a ' + type;
        throw new Error(msg);
      }

      debug('%s %o', event, this.path);

      let layer = Layer('/', handle);
      layer.event = event;

      this.events[event] = true;
      this.stack.push(layer);
    }

    return this;
  }
});
