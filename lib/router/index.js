'use strict';

const debug = require('debug')('line-message:router');
const setPrototypeOf = require('setprototypeof');
const Route = require('./route');
const Layer = require('./layer');

const slice = Array.prototype.slice;

let proto = module.exports = function (options) {
  function router(msg, line, next) {
    router.handle(msg, line, next);
  }

  setPrototypeOf(router, proto);

  router.params = {};
  router._params = [];
  router.stack = [];

  return router;
};

proto.handle = function (msg, line, out) {
  let self = this;

  msg.event = getEvent(msg);
  msg.path = getPath(msg.event, msg);

  // console.log('dispatching %s %s', msg.event, msg.path);
  debug('dispatching %s %s', msg.event, msg.path);

  let idx = 0;
  let paramcalled = {};

  let stack = self.stack;

  let parentParams = msg.params;
  let done = restore(out, msg, 'next', 'params');

  // console.log(done);

  msg.next = next;

  next();

  function next(err) {
    let layerError = (err === 'route') ? null : err;

    // console.log('next check', layerError, idx >= stack.length);
    if (layerError === 'router') {
      setImmediate(done, new Error('Layer error'));
      return
    }

    if (idx >= stack.length) {
      setImmediate(done, new Error('Stack overflow'));
      return;
    }

    let path = msg.path;
    if (path == null) {
      return done(layerError);
    }

    let layer;
    let match;
    let route;

    while (match !== true && idx < stack.length) {
      layer = stack[idx++];
 
      match = matchLayer(layer, path);
      route = layer.route;


      if (typeof match !== 'boolean') {
        layerError = layerError || match;
      }

      if (match !== true) {
        continue;
      }

      if (!route) {
        continue;
      }

      if (layerError) {
        match = false;
        continue;
      }

      let event = msg.event;
      let has_event = route._handles_event(event);
    }

    if (match !== true) {
      return done(null, msg, line);
    }

    if (route) {
      msg.route = route;
    }

    msg.params = layer.params;
    let layerPath = layer.path;
    self.process_params(layer, paramcalled, msg, line, function (err) {
      if (err) {
        return next(layerError || err);
      }

      if (route) {
        return layer.handle_request(msg, line, next);
      }

      trim_prefix(layer, layerError, layerPath, path);
    });
  }

  function trim_prefix(layer, layerError, layerPath, path) {
    debug('%s %s : %s', layer.name, layerPath, msg.originalPath);

    if (layerError) {
      layer.handle_error(layerError, msg, line, next);
    } else {
      layer.handle_request(msg, line, next);
    }
  }
}

proto.process_params = function (layer, called, msg, line, done) {
  let params = this.params;

  let keys = layer.keys;

  if (!keys || keys.length === 0) {
    return done();
  }

  let i = 0;
  let name;
  let paramIndex = 0;
  let key;
  let paramVal;
  let paramCallbacks;
  let paramCalled;

  function param (err) {
    if (err) {
      return done(err);
    }

    if (i >= keys.length ) {
      return done();
    }

    paramIndex = 0;
    key = keys[i++];
    name = key.name;
    paramVal = msg.params[name];
    paramCallbacks = params[name];
    paramCalled = called[name];

    if (paramVal === undefined || !paramCallbacks) {
      return param();
    }

    if (paramCalled && (paramCalled.match === paramVal
      || (paramCalled.error && paramCalled.error !== 'route'))) {
        msg.params[name] = paramCalled.value;
        return param(paramCalled.error);
    }

    called[name] = paramCalled = {
      error: null,
      match: paramVal,
      value: paramVal
    };

    paramCallback();
  }

  function paramCallback(err) {
    let fn = paramCallbacks[paramIndex++];

    paramCalled.value = req.params[key.name];

    if (err) {
      paramCalled.error = err;
      param(err);
      return;
    }

    if (!fn) return param();

    try {
      fn(msg, line, paramCallback, paramVal, key.name);
    } catch (e) {
      paramCallback(e);
    }
  }

  param();
}

proto.route = function (path) {
  let route = new Route(path);

  // console.log("\n\n", route.dispatch, "\n\n");
  var layer = new Layer(path, route.dispatch.bind(route));

  layer.route = route;
  this.stack.push(layer);
  return route;
}

function restore(fn, obj) {
  let props = new Array(arguments.length - 2);
  let vals = new Array(arguments.length - 2);

  for (let i in props) {
    props[i] = arguments[i + 2];
    vals[i] = obj[props[i]];
  }

  return function () {
    // restore vals
    for (let i in props) {
      obj[props[i]] = vals[i];
    }

    return fn.apply(this, arguments);
  };
}

function matchLayer(layer, path) {
  try {
    return layer.match(path);
  } catch (err) {
    return err;
  }
}

function getEvent(msg) {
  if (msg.getType() === 'message') {
    return msg.getMessageType();
  }
  return msg.getType();
}

function getPath(event, msg) {
  if (event === 'text') {
    return msg.getText();
  } else if (event === 'postback') {
    return msg.getPostbackData();
  } else {
    return 'none';
  }
}
