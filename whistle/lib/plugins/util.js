var util = require('../util');

var ORG_RE = /^@[\w\-]+$/;
var WHISLTE_PLUGIN_RE = /^whistle\.[a-z\d_\-]+$/;
var HTTP_RE = /^https?:\/\//i;

function isOrgModule(name) {
  return ORG_RE.test(name);
}

exports.isOrgModule = isOrgModule;

function isWhistleModule(name) {
  return WHISLTE_PLUGIN_RE.test(name);
}

exports.isWhistleModule = isWhistleModule;

function getHomePageFromPackage(pkg) {
  if (HTTP_RE.test(pkg.homepage)) {
    return pkg.homepage;
  }

  return extractUrl(pkg.repository) || '';
}

function extractUrl(repository) {
  if (!repository || repository.type != 'git'
|| typeof repository.url != 'string') {
    return;
  }

  var url = repository.url.replace(/^git\+/i, '');
  if (!HTTP_RE.test(url)) {
    url = url.replace(/^git@([^:]+):/, 'http://$1/');
  }

  return url.replace(/\.git\s*$/i, '');
}

exports.getHomePageFromPackage = getHomePageFromPackage;

exports.parseValues = function(val) {
  if (val) {
    val = util.parseJSON(val);
  }
  if (!val) {
    return '';
  }
  Object.keys(val).forEach(function(key) {
    val[key] = util.toString(val[key]);
  });
  return val;
};

