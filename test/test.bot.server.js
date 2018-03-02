'use strict';

const chai = require('chai');
const should = chai.should();
const request = require('request');
const Line = require('line-messaging');
const LineExpress = require('../');

let app = require('express')();

describe('LINE Server Request Webhook', function () {
  var options = {
    channelID: '1482333960',
    channelSecret: 'testsecret',
    channelAccessToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9/eyJzdWIiOiIyMDAiLCJpc3MiOiJodHRwOlwvXC9lZGNtcy5tb25vaW5mb3N5c3RlbXMuY29tXC9hcGlcL3YxXC9hdXRoXC9sb2dpbiIsImlhdCI6MTQ3NTAzMDc5MiwiZXhwIjoxNDc1MDM0MzkyLCJuYmYiOjE0NzUwMzA3OTIsImp0aSI6IjNkMTlkZjRhOTQ4YzgxNjU2ZTUzMzZlZjVmY2E2YWIwIn0/Fdmehk8h50Aeg5k8yHG9vsNJXvVQGQI5rdpz0rndge8'
  };

  let line = Line.Client(options);
  app.use(line.webhook('/webhook'));
  let bot = LineExpress(line);

  let checkUser = function (msg, line, next) {
    msg.getUserId().should.equal('U206d25c2ea6bd87c17655609a1c37cb8');
    next();
  }

  bot.text(['สวัสดี:name', 'hello:name'], checkUser, function (msg, line) {
    msg.getText().should.equal('Hello, world');
  });

  bot.without(function (msg, line) {
    msg.getType().should.equal(Line.Events.FOLLOW);
  });

  before(function () {
    app.listen(8000);
  });

  it('should return 200', function (done) {
    var requestJsonData = {
      "events": [{
        "replyToken": "nHuyWiB7yP5Zw52FIkcQobQuGDXCTA",
        "type": "message",
        "timestamp": 1462629479859,
        "source": {
          "type": "user",
          "userId": "U206d25c2ea6bd87c17655609a1c37cb8"
        },
        "message": {
          "id": "325708",
          "type": "text",
          "text": "Hello, world"
        }
      },
      {
        "replyToken": "nHuyWiB7yP5Zw52FIkcQobQuGDXCTA",
        "type": "follow",
        "timestamp": 1462629479859,
        "source": {
          "type": "user",
          "userId": "U206d25c2ea6bd87c17655609a1c37cb8"
        }
      }]
    };
    var signature = 'aXw15BTDYeDJoj43ZLHYvk+acSoTCiUb//kTYKovZSg=';

    request({
      method: 'POST',
      url: 'http://localhost:8000/webhook',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature
      },
      body: JSON.stringify(requestJsonData)
    }, function (error, response, body) {
      response.statusCode.should.equal(200);
      done();
    });
  });
});