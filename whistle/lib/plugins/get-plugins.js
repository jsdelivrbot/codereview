var path = require('path');
var fs = require('fs');
var protocols = require('../rules/protocols');
var util = require('./util');
var mp = require('./module-paths');

function readPluginMoudles(dir, callback, plugins) {
  fs.readdir(dir, function(err, list) {
    plugins = plugins || {};
    if (err) {
      return callback(plugins);
    }

    var count = 0;
    var callbackHandler = function() {
      list.forEach(function(name) {
        if (!plugins[name]) {
          plugins[name] = path.join(dir, name);
        }
      });
      callback(plugins);
    };
    list = list.filter(function(name) {
      if (util.isWhistleModule(name)) {
        return true;
      }

      if (util.isOrgModule(name)) {
        try {
          var _dir = path.join(dir, name);
          ++count;
          fs.readdir(_dir, function(err, list) {
            if (!err) {
              list.forEach(function(name) {
                if (!plugins[name] && util.isWhistleModule(name)) {
                  plugins[name] = path.join(_dir, name);
                }
              });
            }

            if (--count <= 0) {
              callbackHandler();
            }
          });
        } catch(e) {}
      }

      return false;
    });

    if (!count) {
      callbackHandler();
    }
  });
}

module.exports = function(callback) {
  var plugins = {};
  var result = {};
  var paths = mp.getPaths();
  var count = paths.length;
  if (!count) {
    return callback(result);
  }
  var callbackHandler = function() {
    if (--count <= 0) {
      callback(result);
    }
  };
  paths.forEach(function(dir) {
    readPluginMoudles(dir, function() {
      var list = Object.keys(plugins).filter(function(name) {
        return !protocols.contains(name.split('.')[1]);
      });
      var len = list.length;
      list.forEach(function(name) {
        var dir = plugins[name];
        var pkgPath = path.join(dir, 'package.json');
        fs.stat(pkgPath, function(err, stats) {
          if (stats && stats.mtime) {
            result[name.split('.')[1] + ':'] = {
              path: dir,
              pkgPath: pkgPath,
              mtime: stats.mtime.getTime()
            };
          }
          if (--len <= 0) {
            callbackHandler();
          }
        });
      });

      if (!len) {
        callbackHandler();
      }
    }, plugins);
  });
};


