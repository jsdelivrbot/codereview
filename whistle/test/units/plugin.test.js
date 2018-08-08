var util = require('../util.test');

module.exports = function() {
  util.request('http://test.local.whistlejs.com/index.html?doNotParseJson', function(res, body) {
    body.should.equal('uiServer');
  });
  util.request('http://test1.local.whistlejs.com/index.html?doNotParseJson', function(res, body) {
    res.statusCode.should.equal(404);
    body.should.equal('<pre>Not Found</pre>');
  });
  util.request('http://plugin.whistlejs.com:1234/index.html', function(res, data) {
    data.should.have.property('type', 'server');
  });

  util.request('wss://321.whistlejs.com/index.html', function(data) {
    data.ruleValue.should.equal('abc');
  });

  util.request('wss://321.ws1.whistlejs.com:2222/index.html', function(data) {
    data.host.should.equal('127.0.0.1:9999');
  });
};
