var util = require('../util.test');

module.exports = function() {
  util.request('http://js1.test.whistlejs.com/index.html?resBody=_', function(res, body) {
    body.should.equal('_\r\n<script>js</script>');
  });

  util.request({
    method: 'post',
    url: 'https://js2.test.whistlejs.com/index.html?resBody=_'
  }, function(res, body) {
    body.should.equal('_\r\njs');
  });

  util.request({
    method: 'post',
    url: 'https://js3.test.whistlejs.com/index.html?resBody=_'
  }, function(res, body) {
    body.should.equal('_');
  });
};
