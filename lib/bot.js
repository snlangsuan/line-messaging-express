'use strict';

const Line = require('line-messaging');
const App = require('./application');

exports = module.exports = createApplication;

function createApplication (options, express) {
  let app = new App(options);
  app.init();

  let webhook = (options.webhookPath) ? options.webhookPath : '/webhook';
  if (express) express.use(app.webhook(webhook));

  return app;
}
