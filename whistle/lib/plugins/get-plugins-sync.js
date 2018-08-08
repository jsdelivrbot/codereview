var path = require('path');
var fs = require('fs');
var fse = require('fs-extra2');
var protocols = require('../rules/protocols');
var comUtil = require('../util');
var util = require('./util');
var mp = require('./module-paths');
var paths = mp.getPaths();

function readPluginMoudlesSync(dir, plugins) {
  plugins = plugins || {};
  try {
    var list = fs.readdirSync(dir).filter(function(name) {
      if (util.isWhistleModule(name)) {
        return true;
      }

      if (util.isOrgModule(name)) {
        try {
          var _dir = path.join(dir, name);
          fs.readdirSync(_dir).forEach(function(name) {
            if (!plugins[name] && util.isWhistleModule(name)) {
              plugins[name] = path.join(_dir, name);
            }
          });
        } catch(e) {}
      }
      return false;
    });

    list.forEach(function(name) {
      if (!plugins[name]) {
        plugins[name] = path.join(dir, name);
      }
    });
  } catch(e) {}

  return plugins;
}

module.exports = function() {
  var plugins = {};
  paths.forEach(function(dir) {
    readPluginMoudlesSync(dir, plugins);
  });

  var _plugins = {};
  Object.keys(plugins).forEach(function(name) {
    var simpleName = name.split('.')[1];
    if (protocols.contains(simpleName)) {
      return;
    }
    var dir = plugins[name];
    try {
      var pkgPath = path.join(dir, 'package.json');
      var pkg = fse.readJsonSync(pkgPath);
      if (pkg && pkg.version) {
        var stats = fs.statSync(pkgPath);
        var plugin = {
          moduleName: pkg.name,
          priority: parseInt(pkg.pluginPriority, 10) || 0,
          registry: comUtil.getRegistry(pkg),
          path: dir,
          pkgPath: pkgPath,
          mtime: stats.mtime.getTime(),
          version: pkg.version,
          description: pkg.description,
          homepage: util.getHomePageFromPackage(pkg),
          rules: comUtil.trim(comUtil.readFileSync(path.join(dir, 'rules.txt'))),
          _rules: comUtil.trim(comUtil.readFileSync(path.join(dir, '_rules.txt'))),
          _values: util.parseValues(comUtil.readFileSync(path.join(dir, '_values.txt')))
        };

        _plugins[simpleName + ':'] = plugin;
      }
    } catch(e) {}
  });

  return _plugins;
};


