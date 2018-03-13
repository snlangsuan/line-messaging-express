'use strict';

const flatten = require('array-flatten');
const Line = require('line-messaging');
const LineEvents = require('./line.events');
const debug = require('debug')('line-message:app');
const setPrototypeOf = require('setprototypeof');
const Router = require('./router');

const events = LineEvents.keyword;
const noneEvents = LineEvents.none;
const slice = Array.prototype.slice;

let proto = module.exports = function (options) {
  function application() {}

  setPrototypeOf(application, proto);

  application.line = undefined;
  application.options = {};

  if (options && options.constructor.name === 'Bot') {
    application.line = options;
  } else if (typeof options === 'object') {
    application.line = Line.Client(options);
  } else {
    throw new Error('Parameter must be instance of `line-messaging` or options');
  }

  return application;
};

proto.init = function () {
  let self = this;

  let done = function (error, msg, line) {
    if (error) {
      debug('has error %s', error.message);
      return;
    }

    if (msg && line) {
      self._without && self._without(msg, line);
    }
  }

  Object.keys(Line.Events).forEach(function (key) {
    let event = Line.Events[key];

    self.line.on(event, function (replyToken, message) {
      let router = self._router;
      router.handle(message, self.line, done);
    });
  });
}

proto.webhook = function (path) {
  return this.line.webhook(path);
}

proto.lazyrouter = function () {
  if (!this._router) {
    this._router = new Router();
  }
}

proto.without = function (callback) {
  this._without = callback;
}

events.forEach(function (event) {
  proto[event] = function (path) {
    if (arguments.length < 2) throw new Error('Event must be callback function');
    this.lazyrouter();
  
    let route = this._router.route(path);
    route[event].apply(route, slice.call(arguments, 1));
    return this;
  }
});

noneEvents.forEach(function (event) {
  proto[event] = function () {
    if (arguments.length < 1) throw new Error('Event must be callback function');
    this.lazyrouter();
    let route = this._router.route('event' + event);
    route[event].apply(route, arguments);
    return this;
  }
});