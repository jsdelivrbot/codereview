'use strict';

const mm = require('mm');
const request = require('supertest');
const assert = require('assert');
const utils = require('./utils');

describe('test/egg-ts.test.js', () => {
  let app;

  beforeEach(() => {
    require.extensions['.ts'] = require.extensions['.js'];
  });

  afterEach(() => {
    mm.restore();
    delete require.extensions['.ts'];
  });

  it('should support load ts file', async () => {
    mm(process.env, 'EGG_TYPESCRIPT', 'true');
    app = utils.createApp('egg-ts');

    app.Helper = class Helper {};
    app.loader.loadPlugin();
    app.loader.loadConfig();
    app.loader.loadApplicationExtend();
    app.loader.loadAgentExtend();
    app.loader.loadRequestExtend();
    app.loader.loadResponseExtend();
    app.loader.loadContextExtend();
    app.loader.loadHelperExtend();
    app.loader.loadService();
    app.loader.loadController();
    app.loader.loadRouter();
    app.loader.loadPlugin();
    app.loader.loadMiddleware();
    app.loader.loadCustomApp();
    app.loader.loadCustomAgent();

    await request(app.callback())
      .get('/')
      .expect(res => {
        assert(res.text.includes('from extend context'));
        assert(res.text.includes('from extend application'));
        assert(res.text.includes('from extend request'));
        assert(res.text.includes('from extend agent'));
        assert(res.text.includes('from extend helper'));
        assert(res.text.includes('from extend response'));
        assert(res.text.includes('from custom app'));
        assert(res.text.includes('from custom agent'));
        assert(res.text.includes('from plugins'));
        assert(res.text.includes('from config.default'));
        assert(res.text.includes('from middleware'));
        assert(res.text.includes('from service'));
      })
      .expect(200);
  });

  it('should not load d.ts files while typescript was true', async () => {
    mm(process.env, 'EGG_TYPESCRIPT', 'true');
    app = utils.createApp('egg-ts-js');

    app.loader.loadController();
    assert(!app.controller.god);
    assert(app.controller.test);
  });

  it('should support load ts,js files', async () => {
    mm(process.env, 'EGG_TYPESCRIPT', 'true');
    app = utils.createApp('egg-ts-js');

    app.loader.loadService();
    assert(app.serviceClasses.lord);
    assert(app.serviceClasses.test);
  });

  it('should not load ts files while EGG_TYPESCRIPT was not exist', async () => {
    app = utils.createApp('egg-ts-js');

    app.loader.loadApplicationExtend();
    app.loader.loadService();
    assert(!app.appExtend);
    assert(app.serviceClasses.lord);
    assert(!app.serviceClasses.test);
  });

  it('should not load ts files while EGG_TYPESCRIPT was true but no extensions', async () => {
    mm(process.env, 'EGG_TYPESCRIPT', 'true');
    delete require.extensions['.ts'];
    app = utils.createApp('egg-ts-js');

    app.loader.loadApplicationExtend();
    app.loader.loadService();
    assert(!app.appExtend);
    assert(app.serviceClasses.lord);
    assert(!app.serviceClasses.test);
  });
});
