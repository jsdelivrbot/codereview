var forge = require('node-forge');
var fs = require('fs');
var net = require('net');
var path = require('path');
var crypto = require('crypto');
var LRU = require('lru-cache');
var pki = forge.pki;
var createSecureContext = require('tls').createSecureContext || crypto.createCredentials;
var util = require('../util');
var config = require('../config');

exports.createSecureContext = createSecureContext;
var CUR_VERSION = process.version;
var requiredVersion = parseInt(CUR_VERSION.slice(1), 10) >= 6;
var HTTPS_DIR = util.mkdir(path.join(config.getDataDir(), 'certs'));
var ROOT_NEW_KEY_FILE = path.join(HTTPS_DIR, 'root_new.key');
var ROOT_NEW_CRT_FILE = path.join(HTTPS_DIR, 'root_new.crt');
var useNewKey = fs.existsSync(ROOT_NEW_KEY_FILE) && fs.existsSync(ROOT_NEW_CRT_FILE);
var ROOT_KEY_FILE = useNewKey ? ROOT_NEW_KEY_FILE : path.join(HTTPS_DIR, 'root.key');
var ROOT_CRT_FILE = useNewKey ? ROOT_NEW_CRT_FILE : path.join(HTTPS_DIR, 'root.crt');
var customCertDir = config.certDir;
var customPairs = {};
var customCertCount = 0;
var cachePairs = new LRU({max: 5120});
var ILEGAL_CHAR_RE = /[^a-z\d-]/i;
var RANDOM_SERIAL = '.' + Date.now() + '.' + Math.floor(Math.random() * 10000);
var PORT_RE = /:\d*$/;

var ROOT_KEY, ROOT_CRT;

if (!useNewKey && requiredVersion && !checkCertificate()) {
  try {
    fs.unlinkSync(ROOT_KEY_FILE);
    fs.unlinkSync(ROOT_CRT_FILE);
  } catch(e) {}
}

function checkCertificate() {
  try {
    var crt = pki.certificateFromPem(fs.readFileSync(ROOT_CRT_FILE));
    if (crt.publicKey.n.toString(2).length < 2048) {
      return false;
    }
    return /^whistle\.\d+$/.test(getCommonName(crt));
  } catch(e) {}
  return true;
}

function getCommonName(crt) {
  var attrs = crt.issuer && crt.issuer.attributes;
  if (Array.isArray(attrs)) {
    for (var i = 0, len = attrs.length; i < len; i++) {
      var attr = attrs[i];
      if (attr && attr.name === 'commonName') {
        return attr.value;
      }
    }
  }
  return '';
}

function getDomain(hostname) {
  if (getCertificate(hostname) || net.isIP(hostname)) {
    return hostname;
  }
  var list = hostname.split('.');
  var prefix = list[0];
  list[0] = '*';
  var wildDomain = list.join('.');
  if (getCertificate(wildDomain)) {
    return wildDomain;
  }
  var len = list.length;
  if (len < 3) {
    return hostname;
  }
  if (len > 3 || ILEGAL_CHAR_RE.test(prefix) || list[1].length > 3
    || list[2] === 'com' || list[1] === 'url') { // For tencent cdn
    return wildDomain;
  }

  return hostname;
}

exports.getDomain = getDomain;

exports.existsCustomCert = function(hostname) {
  if (!customCertCount) {
    return false;
  }
  hostname = hostname.replace(PORT_RE, '');
  var cert = customPairs[hostname];
  if (cert) {
    return true;
  }
  hostname = hostname.split('.');
  hostname[0] = '*';
  return customPairs[hostname.join('.')];
};

function getCertificate(hostname) {
  return customPairs[hostname] || cachePairs.get(hostname);
}

function createCertificate(hostname) {
  var cert = getCertificate(hostname);
  if (cert) {
    return cert;
  }

  var serialNumber = crypto.createHash('sha1')
    .update(hostname + RANDOM_SERIAL, 'binary').digest('hex');
  cert = createCert(pki.setRsaPublicKey(ROOT_KEY.n, ROOT_KEY.e), serialNumber);

  cert.setSubject([{
    name: 'commonName',
    value: hostname
  }]);

  cert.setIssuer(ROOT_CRT.subject.attributes);
  cert.setExtensions([ {
    name: 'subjectAltName',
    altNames: [net.isIP(hostname) ?
      {
        type: 7,
        ip: hostname
      } : {
        type: 2,
        value: hostname
      }]
  } ]);
  cert.sign(ROOT_KEY, forge.md.sha256.create());
  cert = {
    key: pki.privateKeyToPem(ROOT_KEY),
    cert: pki.certificateToPem(cert)
  };
  cachePairs.set(hostname, cert);
  return cert;
}

function loadCustomCerts() {
  if (!customCertDir) {
    return;
  }
  var certs = {};
  try {
    fs.readdirSync(customCertDir).forEach(function(name) {
      if (!/^(.+)\.(crt|key)$/.test(name)) {
        return;
      }
      var filename =RegExp.$1;
      var suffix = RegExp.$2;
      var cert = certs[filename] = certs[filename] || {};
      if (suffix === 'crt') {
        suffix = 'cert';
      }
      try {
        cert[suffix] = fs.readFileSync(path.join(customCertDir, name), {encoding: 'utf8'});
      } catch(e) {}
    });
  } catch(e) {}
  var rootCA = certs.root;
  delete certs.root;
  if (rootCA && rootCA.key && rootCA.cert) {
    ROOT_KEY_FILE = path.join(customCertDir, 'root.key');
    ROOT_CRT_FILE = path.join(customCertDir, 'root.crt');
  }
  Object.keys(certs).forEach(function(hostname) {
    var cert = certs[hostname];
    if (!cert || !cert.key || !cert.cert) {
      return;
    }
    try {
      var altNames = getAltNames(cert);
      altNames.forEach(function(item) {
        if ((item.type === 2 || item.type === 7) && !customPairs[item.value]) {
          customPairs[item.value] = cert;
        }
      });
    } catch (e) {}
  });
  customCertCount = Object.keys(customPairs).length;
}

function getAltNames(cert) {
  var exts = pki.certificateFromPem(cert.cert).extensions;
  for (var i = 0, len = exts.length; i < len; i++) {
    var item = exts[i];
    if (item.name === 'subjectAltName') {
      return item.altNames;
    }
  }
}

function createRootCA() {
  loadCustomCerts();
  if (ROOT_KEY && ROOT_CRT) {
    return;
  }
  var rootKey, rootCrt;
  try {
    ROOT_KEY = fs.readFileSync(ROOT_KEY_FILE);
    ROOT_CRT = fs.readFileSync(ROOT_CRT_FILE);
    rootKey = ROOT_KEY;
    rootCrt = ROOT_CRT;
  } catch (e) {
    ROOT_KEY = ROOT_CRT = null;
  }

  if (ROOT_KEY && ROOT_CRT && ROOT_KEY.length && ROOT_CRT.length) {
    ROOT_KEY = pki.privateKeyFromPem(ROOT_KEY);
    ROOT_CRT = pki.certificateFromPem(ROOT_CRT);
  } else {
    var cert = createCACert();
    ROOT_CRT = cert.cert;
    ROOT_KEY = cert.key;
    rootKey = pki.privateKeyToPem(ROOT_KEY);
    rootCrt = pki.certificateToPem(ROOT_CRT);
    fs.writeFileSync(ROOT_KEY_FILE, rootKey.toString());
    fs.writeFileSync(ROOT_CRT_FILE, rootCrt.toString());
  }

  try {
    exports.DEFAULT_CERT_CTX = createSecureContext({
      key: ROOT_KEY,
      cert: ROOT_CRT
    });
  } catch (e) {
    exports.DEFAULT_CERT_CTX = createSecureContext({
      key: rootKey,
      cert: rootCrt
    });
  }
}

function getRandom() {
  var random = Math.floor(Math.random() * 1000);
  if (random < 10) {
    return '00' + random;
  }
  if (random < 100) {
    return '0' + random;
  }
  return '' + random;
}

function createCACert() {
  var keys = pki.rsa.generateKeyPair(requiredVersion ? 2048 : 1024);
  var cert = createCert(keys.publicKey);
  var now = Date.now() + getRandom();
  var attrs = [ {
    name : 'commonName',
    value : 'whistle.' + now
  }, {
    name : 'countryName',
    value : 'CN'
  }, {
    shortName : 'ST',
    value : 'ZJ'
  }, {
    name : 'localityName',
    value : 'HZ'
  }, {
    name : 'organizationName',
    value : now + '.wproxy.org'
  }, {
    shortName : 'OU',
    value : 'wproxy.org'
  } ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([ {
    name : 'basicConstraints',
    cA : true
  }, {
    name : 'keyUsage',
    keyCertSign : true,
    digitalSignature : true,
    nonRepudiation : true,
    keyEncipherment : true,
    dataEncipherment : true
  }, {
    name : 'extKeyUsage',
    serverAuth : true,
    clientAuth : true,
    codeSigning : true,
    emailProtection : true,
    timeStamping : true
  }, {
    name : 'nsCertType',
    client : true,
    server : true,
    email : true,
    objsign : true,
    sslCA : true,
    emailCA : true,
    objCA : true
  } ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    key: keys.privateKey,
    cert: cert
  };
}

function createCert(publicKey, serialNumber) {
  var cert = pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = serialNumber || '01';
  var curYear = new Date().getFullYear();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notBefore.setFullYear(curYear - 1);
  cert.validity.notAfter.setFullYear(curYear + 10);
  return cert;
}

function getRootCAFile() {
  return ROOT_CRT_FILE;
}

createRootCA();// 启动生成ca
exports.getRootCAFile = getRootCAFile;
exports.createCertificate = createCertificate;

