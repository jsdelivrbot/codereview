var http = require('http');
var https = require('https');
var parseUrl = require('url').parse;
var net = require('net');
var path = require('path');
var StringDecoder = require('string_decoder').StringDecoder;
require('should');
require('should-http');
var fs = require('fs');
var fse = require('fs-extra2');
var startWhistle = require('../index');
var socks = require('socksv5');
var util = require('./util.test');
var config = require('./config.test');
var values = util.getValues();
var testList = fs.readdirSync(path.join(__dirname, './units')).map(function(name) {
  return require('./units/' + name);
});
var defaultRules = fs.readFileSync(path.join(__dirname, 'rules.txt'), {encoding: 'utf8'});
var options = {
  key: fs.readFileSync(path.join(__dirname, 'assets/certs/root.key')),
  cert: fs.readFileSync(path.join(__dirname, 'assets/certs/_root.crt'))
};
var count = 6;

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: config.wsPort });
var WHISTLE_PATH = process.env.WHISTLE_PATH = __dirname;
var PLUGINS_PATH = path.join(WHISTLE_PATH, '.whistle/node_modules');
//Node7及以下使用非SNI Server
if (process.versions.modules <= 51) {
  require('hagent').serverAgent.existsServer = function() {
    return true;
  };
}

fse.removeSync(path.join(WHISTLE_PATH, '.whistle'));
fse.copySync(path.join(__dirname, 'plugins'), PLUGINS_PATH);

wss.on('connection', function connection(ws) {
  var req = ws.upgradeReq;
  ws.on('message', function(msg) {
    ws.send(JSON.stringify({
      type: 'server',
      method: req.method,
      headers: req.headers,
      body: msg
    }, null, '\t'));
  });
});

http.createServer(function(req, res) {
  req.on('error', util.noop);
  res.on('error', util.noop);

  var body = '';
  var decoder = new StringDecoder('utf8');
  req.on('data', function(data) {
    body += decoder.write(data);
  });
  req.on('end', function() {
    body += decoder.end();
    res.end(JSON.stringify({
      type: 'server',
      url: req.url,
      method: req.method,
      headers: req.headers,
      body: body
    }, null, '\t'));
  });
}).listen(config.serverPort, startTest);

https.createServer(options, function(req, res) {
  res.end(JSON.stringify({
    headers: req.headers,
    body: 'test'
  }));
}).listen(config.httpsPort, startTest);
values['options.html'] = {
  method: 'options'
};
var proxy = startWhistle({
  port: config.port,
  storage: 'test_',
  certDir: path.join(__dirname, 'assets/certs'),
  debugMode: true,
  localUIHost: 'local.whistle.com|local2.whistle.com&localn.whistle.com',
  pluginHost: 'test=test.local.whistle.com|b.test.local.whistle.com&test3.local.whistle.com,',
  rules: {
    Default: defaultRules,
    test: {
      rules: 'test.options.com file://{options.html}',
      enable: true
    },
    abc: '123'
  },
  values: values,
  copy: true
}, startTest);

proxy.on('tunnelRequest', util.noop);
proxy.on('wsRequest', util.noop);
proxy.on('_request', util.noop);
var socksServer = socks.createServer(function(info, accept, deny) {
  var socket, client;
  if (info.dstPort === 443) {
    if (socket = accept(true)) {
      client = net.connect({
        host: '127.0.0.1',
        port: 5566
      }, function() {
        socket.pipe(client).pipe(socket);
      });
    }
    return;
  }
  if (info.dstPort === 8081) {
    if (socket = accept(true)) {
      client = net.connect({
        host: '127.0.0.1',
        port: 8081
      }, function() {
        socket.pipe(client).pipe(socket);
      });
    }
    return;
  }
  if (socket = accept(true)) {
    var body = JSON.stringify({
      port: config.socksPort
    });
    socket.end([
      'HTTP/1.1 200 OK',
      'Connection: close',
      'Content-Type: text/plain;charset=utf8',
      'Content-Length: ' + Buffer.byteLength(body),
      '',
      body
    ].join('\r\n'));
  }
});

var authSocksServer = socks.createServer(function(info, accept, deny) {
  var socket;
  if (info.dstPort === 443) {
    if (socket = accept(true)) {
      var client = net.connect({
        host: '127.0.0.1',
        port: 5566
      }, function() {
        socket.pipe(client).pipe(socket);
      });
    }
    return;
  }
  if (socket = accept(true)) {
    var body = JSON.stringify({
      port: config.authSocksPort
    });
    socket.end([
      'HTTP/1.1 200 OK',
      'Connection: close',
      'Content-Type: text/plain;charset=utf8',
      'Content-Length: ' + Buffer.byteLength(body),
      '',
      body
    ].join('\r\n'));
  }
});

socksServer.useAuth(socks.auth.None());
authSocksServer.useAuth(socks.auth.UserPassword(function(user, password, cb) {
  cb(user == 'test' && password == 'hello1234');
}));

socksServer.listen(config.socksPort, startTest);
authSocksServer.listen(config.authSocksPort, startTest);

/**
 * 不用处理异常
 */
var server = http.createServer(function(req, res) {
  var fullUrl = /^http:/.test(req.url) ? req.url : 'http://' + req.headers.host + req.url;
  var options = parseUrl(fullUrl);
  delete options.hostname;
  options.host = '127.0.0.1';
  options.method = req.method;
  options.headers = req.headers;
  var client = http.request(options, function(_res) {
    _res.pipe(res);
  });
  req.pipe(client);
});

server.on('connect', function(req, socket) {
  var tunnelUrl = 'tunnel://' + (/^[^:\/]+:\d+$/.test(req.url) ? req.url : req.headers.host);
  var options = parseUrl(tunnelUrl);
  var client = net.connect({
    host: '127.0.0.1',
    port: options.port || 443
  }, function() {
    socket.pipe(client).pipe(socket);
    socket.write('HTTP/1.1 200 Connection Established\r\nProxy-Agent: whistle/test\r\n\r\n');
  });
});

server.listen(config.proxyPort, startTest);

function startTest() {
  if (--count > 0) {
    return;
  }

  var done;
  function testAll() {
    if (done) {
      return;
    }
    done = true;
    testList.forEach(function(fn) {
      fn();
    });
  }

  (function getData() {
    util.request('http://local.whistlejs.com/cgi-bin/get-data', function() {
      testAll();
      setTimeout(getData, 5000);
    });
  })();
}



