'use strict';

const pathToRegexp = require('path-to-regexp');
const debug = require('debug')('line-messaging:router:layer');
const hasOwnProperty = Object.prototype.hasOwnProperty;

const postbackPattern = new RegExp('([^?=&]+)(=([^&]*))?', 'g');

module.exports = Layer;

function Layer(path, fn) {
  if (!(this instanceof Layer)) {
    return new Layer(path, fn);
  }

  debug('new %o', path);

  this.handle = fn;
  this.name = fn.name || '<anonymous>';
  this.params = undefined;
  this.path = undefined;
  this.regexp = pathToRegexp(path, this.keys = []);
}

Layer.prototype.handle_error = function (error, msg, line, next) {
  let fn = this.handle;

  if (fn.length !== 4) {
    return next(error);
  }

  try {
    fn(error, msg, line, next);
  } catch (err) {
    next(err);
  }
}

Layer.prototype.handle_request = function (msg, line, next) {
  let fn = this.handle;

  if (fn.length > 3) {
    return next();
  }

  try {
    fn(msg, line, next);
  } catch (err) {
    next(err);
  }
}

Layer.prototype.match = function (path) {
  let match;

  if (path != null) {
    match = this.regexp.exec(path);
  }

  if (!match) {
    this.params = undefined;
    this.path = undefined;
    return false;
  }

  this.params = {};
  this.path = match[0]

  let keys = this.keys;
  let params = this.params;

  if (this.event && this.event === 'postback') {
    this.params = getPostback(path);
  } else {
    for (let i = 1; i < match.length; i++) {
      let key = keys[i - 1];
      let prop = key.name;
      let val = match[i];

      if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
        params[prop] = val;
      }
    }
  }

  return true;
}

function getPostback (path) {
  let params = {};
  path.replace(postbackPattern, function ($0, $1, $2, $3) {
    params[$1] = $3
  });

  return params;
}
