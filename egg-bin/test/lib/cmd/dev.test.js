'use strict';

const path = require('path');
const coffee = require('coffee');
const net = require('net');
const mm = require('mm');

describe('test/lib/cmd/dev.test.js', () => {
  const eggBin = require.resolve('../../../bin/egg-bin.js');
  const cwd = path.join(__dirname, '../../fixtures/demo-app');

  afterEach(mm.restore);

  it('should startCluster success', () => {
    mm(process.env, 'NODE_ENV', 'development');
    return coffee.fork(eggBin, [ 'dev' ], { cwd })
      // .debug()
      .expect('stdout', /"workers":1/)
      .expect('stdout', /"baseDir":".*?demo-app"/)
      .expect('stdout', /"framework":".*?aliyun-egg"/)
      .expect('stdout', /NODE_ENV: development/)
      .expect('code', 0)
      .end();
  });

  it('should dev start with custom NODE_ENV', () => {
    mm(process.env, 'NODE_ENV', 'prod');
    return coffee.fork(eggBin, [ 'dev' ], { cwd })
      // .debug()
      .expect('stdout', /"workers":1/)
      .expect('stdout', /"baseDir":".*?demo-app"/)
      .expect('stdout', /"framework":".*?aliyun-egg"/)
      .expect('stdout', /NODE_ENV: prod/)
      .expect('code', 0)
      .end();
  });

  it('should startCluster with --harmony success', done => {
    coffee.fork(eggBin, [ 'dev', '--harmony' ], { cwd })
      // .debug()
      .expect('stdout', /"workers":1/)
      .expect('stdout', /"baseDir":".*?demo-app"/)
      .expect('stdout', /"framework":".*?aliyun-egg"/)
      .expect('stdout', /--harmony/)
      .expect('code', 0)
      .end(done);
  });

  it('should startCluster with --port', done => {
    coffee.fork(eggBin, [ 'dev', '--port', '6001' ], { cwd })
      // .debug()
      .expect('stdout', /"workers":1/)
      .expect('stdout', /"port":6001/)
      .expect('stdout', /"baseDir":".*?demo-app"/)
      .expect('stdout', /"framework":".*?aliyun-egg"/)
      .expect('code', 0)
      .end(done);
  });

  it('should startCluster with --sticky', done => {
    coffee.fork(eggBin, [ 'dev', '--port', '6001', '--sticky' ], { cwd })
      .expect('stdout', /"workers":1/)
      .expect('stdout', /"port":6001/)
      .expect('stdout', /"sticky":true/)
      .expect('stdout', /"baseDir":".*?demo-app"/)
      .expect('stdout', /"framework":".*?aliyun-egg"/)
      .expect('code', 0)
      .end(done);
  });

  it('should startCluster with -p', done => {
    coffee.fork(eggBin, [ 'dev', '-p', '6001' ], { cwd })
      // .debug()
      .expect('stdout', /"workers":1/)
      .expect('stdout', /"port":6001/)
      .expect('stdout', /"baseDir":".*?demo-app"/)
      .expect('stdout', /"framework":".*?aliyun-egg"/)
      .expect('code', 0)
      .end(done);
  });

  it('should startCluster with --cluster=2', done => {
    coffee.fork(eggBin, [ 'dev', '--cluster=2' ], { cwd })
      // .debug()
      .expect('stdout', /"workers":2/)
      .expect('stdout', /"baseDir":".*?demo-app"/)
      .expect('stdout', /"framework":".*?aliyun-egg"/)
      .notExpect('stdout', /"cluster"/)
      .expect('code', 0)
      .end(done);
  });

  it('should startCluster with --baseDir=root', done => {
    coffee.fork(eggBin, [ 'dev', `--baseDir=${cwd}` ])
      // .debug()
      .expect('stdout', /"workers":1/)
      .expect('stdout', /"baseDir":".*?demo-app"/)
      .expect('stdout', /"framework":".*?aliyun-egg"/)
      .expect('code', 0)
      .end(done);
  });

  it('should startCluster with custom yadan framework', done => {
    const baseDir = path.join(__dirname, '../../fixtures/custom-framework-app');
    coffee.fork(eggBin, [ 'dev' ], { cwd: baseDir })
      // .debug()
      .expect('stdout', /yadan start:/)
      .expect('stdout', /"workers":1/)
      .expect('stdout', /"baseDir":".*?custom-framework-app"/)
      .expect('stdout', /"framework":".*?yadan"/)
      .expect('code', 0)
      .end(done);
  });

  describe('auto detect available port', () => {
    let server;
    before(done => {
      server = net.createServer();
      server.listen(7001, done);
    });

    after(() => server.close());

    it('should auto detect available port', done => {
      coffee.fork(eggBin, [ 'dev' ], { cwd })
      // .debug()
        .expect('stderr', /\[egg-bin] server port 7001 is in use, now using port \d+/)
        .expect('code', 0)
        .end(done);
    });
  });

  it('should startCluster with execArgv --inspect', done => {
    coffee.fork(eggBin, [ 'dev', '--inspect=7000' ], { cwd })
      // .debug()
      .expect('stderr', /Debugger listening on .*7000/)
      .expect('code', 0)
      .end(done);
  });

  it('should support --require', () => {
    const script = path.join(__dirname, '../../fixtures/require-script');
    mm(process.env, 'NODE_ENV', 'development');
    return coffee.fork(eggBin, [ 'dev', '--require', script ], { cwd })
      // .debug()
      .expect('stdout', /hey, you require me by --require/)
      .expect('code', 0)
      .end();
  });
});
