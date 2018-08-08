var fs = require('fs');
var extend = require('extend');
var util = require('../util');
var mime = require('mime');
var querystring = require('querystring');
var PassThrough = require('stream').PassThrough;
var protoMgr = require('../rules/protocols');
var CRLF_RE = /\r\n|\r|\n/g;
var RAW_FILE_RE = /rawfile/;
var HEADERS_SEP_RE = /(\r?\n(?:\r\n|\r|\n)|\r\r\n?)/;
var MAX_HEADERS_SIZE = 256 * 1024;
var TPL_RE = /(?:dust|tpl|jsonp):$/;

function isTplProtocol(protocol) {
  return TPL_RE.test(protocol);
}

function isRawFileProtocol(protocol) {
  return RAW_FILE_RE.test(protocol);
}

function readFiles(files, callback) {
  var file = files.shift();
  var execCallback = function(err, stat) {
    if(!err && stat && stat.isFile()) {
      callback(null, file);
    } else if (files.length) {
      readFiles(files, callback);
    } else {
      callback(err || new Error('Not found file ' + file), file);
    }
  };

  !file || typeof file != 'string' ? execCallback() : fs.stat(file, execCallback);
}

function parseRes(str, rawHeaderNames) {
  if (!str) {
    return {
      statusCode: 200,
      headers: {}
    };
  }
  var headers = str.split(CRLF_RE);
  var statusLine = headers.shift().trim().split(/\s+/g);
  return {
    statusCode: statusLine[1] || 200,
    headers: util.parseHeaders(headers, rawHeaderNames)
  };
}

function getRawResByValue(body) {
  var headers;
  if (HEADERS_SEP_RE.test(body)) {
    var crlfStr = RegExp.$1;
    var index = body.indexOf(crlfStr);
    headers = body.substring(0, index);
    body = body.substring(index + crlfStr.length);
  }
  var rawHeaderNames = {};
  var reader = parseRes(headers, rawHeaderNames);
  reader.rawHeaderNames = rawHeaderNames;
  reader.body = body;
  return reader;
}

function getRawResByPath(protocol, path, callback) {
  var reader = fs.createReadStream(path);
  var rawHeaderNames = reader.rawHeaderNames = rawHeaderNames;
  if (isRawFileProtocol(protocol)) {
    var buffer;
    var response = function(err, crlf) {
      reader.removeAllListeners('data');
      reader.removeAllListeners('error');
      reader.removeAllListeners('end');
      var stream = reader;
      reader = new PassThrough();
      if (err) {
        reader.statusCode = 500;
        reader.push(err.stack);
        reader.push(null);
      } else {
        if (crlf) {
          crlf = util.toBuffer(crlf);
          var index = util.indexOfList(buffer, crlf);
          if (index != -1) {
            extend(reader, parseRes(buffer.slice(0, index) + '', rawHeaderNames));
            buffer = buffer.slice(index + crlf.length);
          }
        }
        buffer && reader.push(buffer);
        stream.on('error', function(err) {
          reader.emit('error', err);
        });
        stream.pipe(reader);
      }
      callback(reader);
    };

    reader.on('data', function(data) {
      buffer = buffer ? Buffer.concat([buffer, data]) : data;
      if (HEADERS_SEP_RE.test(buffer + '')) {
        response(null, RegExp.$1);
      } else if (buffer.length > MAX_HEADERS_SIZE) {
        response();
      }
    });
    reader.on('error', response);
    reader.on('end', response);
  } else {
    callback(reader);
  }
}

module.exports = function(req, res, next) {
  var options = req.options;
  var config = this.config;
  var protocol = options && options.protocol;
  if (!protoMgr.isFileProxy(protocol)) {
    return next();
  }
  var defaultType = mime.lookup(req.fullUrl.replace(/[?#].*$/, ''), 'text/html');
  var rule = req.rules.rule;
  if (rule.value) {
    var body = util.removeProtocol(rule.value, true);
    var reader = isRawFileProtocol(protocol) ? getRawResByValue(body) : {
      statusCode: 200,
      body: body,
      headers: {
        'content-type': (rule.key ? mime.lookup(rule.key, defaultType) : defaultType) + '; charset=utf-8'
      }
    };

    if (isTplProtocol(protocol)){
      reader.realUrl = rule.matcher;
      render(reader);
    } else {
      reader = util.wrapResponse(reader);
      reader.realUrl = rule.matcher;
      res.response(reader);
    }
    return;
  }

  readFiles(util.getRuleFiles(rule), function(err, path) {
    if (err) {
      if (/^x/.test(protocol)) {
        var fullUrl = /^xs/.test(protocol) ? req.fullUrl.replace(/^http:/, 'https:') : req.fullUrl;
        extend(options, util.parseUrl(fullUrl));
        next();
      } else {
        var notFound = util.wrapResponse({
          statusCode: 404,
          body: 'Not found file <strong>' + path + '</strong>',
          headers: {
            'content-type': 'text/html; charset=utf-8'
          }
        });
        notFound.realUrl = path;
        res.response(notFound);
      }
      return;
    }

    var headers = {
      'server': config.name,
      'content-type': mime.lookup(path, defaultType) + '; charset=utf-8'
    };

    if (isTplProtocol(protocol)) {
      var reader = {
        statusCode: 200,
        realUrl: path,
        headers: headers
      };
      fs.readFile(path, {encoding: 'utf8'}, function(err, data) {
        if (err) {
          return util.emitError(req, err);
        }
        reader.body = data;
        render(reader);
      });
    } else {
      getRawResByPath(protocol, path, function(reader) {
        reader.realUrl = path;
        reader.statusCode = reader.statusCode || 200;
        reader.headers = reader.headers || headers;
        res.response(reader);
      });
    }
  });

  function render(reader) {
    if (reader.body) {
      var data = querystring.parse(util.getQueryString(req.fullUrl));
      if (Object.keys(data).length) {
        reader.body = reader.body.replace(/\{([\w\-$]+)\}/g, function(all, matched) {
          return matched in data ? data[matched] : all;
        });
      }
    }
    var realUrl = reader.realUrl;
    reader = util.wrapResponse(reader);
    reader.realUrl = realUrl;
    res.response(reader);
  }
};
