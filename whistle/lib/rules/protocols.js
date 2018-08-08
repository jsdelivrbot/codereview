var protocols = ['G', 'host', 'req', 'rule', 'res', 'weinre', 'proxy', 'https2http-proxy', 'http2https-proxy', 'internal-proxy', 'pac', 'filter', 'ignore', 'enable',
                 'disable', 'delete', 'log', 'plugin', 'exports', 'exportsUrl', 'hostname', 'referer', 'auth', 'ua', 'etag', 'urlParams', 'dispatch',
                 'params', 'resMerge', 'statusCode', 'replaceStatus',
                 'redirect', 'method', 'cache', 'attachment', 'forwardedFor', 'responseFor', 'location', 'accept', 'rulesFile', 'resScript', 'reqDelay', 'resDelay', 'reqSpeed', 'resSpeed', 'reqType', 'resType', 'reqCharset',
                 'resCharset', 'reqCookies', 'resCookies', 'reqCors', 'resCors', 'reqHeaders', 'resHeaders', 'reqPrepend', 'resPrepend', 'reqBody', 'resBody', 'reqAppend',
                 'resAppend', 'urlReplace', 'reqReplace', 'resReplace', 'reqWrite', 'resWrite', 'reqWriteRaw', 'resWriteRaw', 'cssAppend', 'htmlAppend', 'jsAppend',
                 'cssBody', 'htmlBody', 'jsBody', 'cssPrepend', 'htmlPrepend', 'jsPrepend'];
var RULE_RE = /^(?:|x|xs)(?:file|rawfile|dust|tpl|jsonp):$/;
var resProtocols = ['res', 'filter', 'disable', 'ignore', 'replaceStatus', 'cache', 'attachment', 'delete', 'resMerge',
'location',  'resDelay', 'resSpeed', 'resType', 'resType', 'resCharset', 'resCookies', 'resCors', 'resHeaders',
'resPrepend', 'resBody', 'resAppend',  'resReplace', 'resWrite', 'resWriteRaw', 'cssAppend', 'htmlAppend', 'jsAppend', 'cssBody', 'htmlBody', 'jsBody', 'cssPrepend', 'htmlPrepend', 'jsPrepend', 'responseFor'];
var binProtocols = ['reqPrepend', 'resPrepend', 'reqBody', 'resBody', 'reqAppend', 'resAppend', 'cssAppend', 'htmlAppend', 'jsAppend', 'cssBody', 'htmlBody', 'jsBody', 'cssPrepend', 'htmlPrepend', 'jsPrepend'];
var aliasProtocols = {
  ruleFile: 'rulesFile',
  ruleScript: 'rulesFile',
  rulesScript: 'rulesFile',
  reqScript: 'rulesFile',
  download: 'attachment',
  exportUrl: 'exportsUrl',
  'http-proxy': 'proxy',
  'xhttp-proxy':'xproxy',
  export: 'exports',
  status: 'statusCode',
  reqHost: 'hostname',
  hosts: 'host',
  html: 'htmlAppend',
  js: 'jsAppend',
  reqMerge: 'params',
  css: 'cssAppend'
};

exports.protocols = protocols;
exports.resProtocols = resProtocols;
exports.aliasProtocols = aliasProtocols;

function getRules() {
  return resetRules({});
}

exports.getRules = getRules;

function isBinProtocol(protocol) {

  return binProtocols.indexOf(protocol) != -1;
}

exports.isBinProtocol = isBinProtocol;

function resetRules(rules) {
  protocols.forEach(function(protocol) {
    rules[protocol] = [];
  });
  rules._localRule = [];
  return rules;
}

exports.resetRules = resetRules;

function isResRule(protocol) {
  return resProtocols.indexOf(protocol) != -1;
}

exports.isResRule = isResRule;

function isWebProtocol(protocol) {
  return protocol == 'http:' || protocol == 'https:';
}

exports.isWebProtocol = isWebProtocol;

function isWebsocketProtocol(protocol) {
  return protocol == 'ws:' || protocol == 'wss:';
}

exports.isWebsocketProtocol = isWebsocketProtocol;

function isFileProxy(protocol) {
  return RULE_RE.test(protocol);
}

exports.isFileProxy = isFileProxy;

function contains(name) {
  if (protocols.indexOf(name) != -1 || name == 'socks' || aliasProtocols[name]) {
    return true;
  }
  name += ':';
  return isWebsocketProtocol(name) || isWebProtocol(name) || isFileProxy(name) || name == 'tunnel:';
}

exports.contains = contains;
