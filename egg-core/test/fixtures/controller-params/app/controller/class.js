'use strict';

module.exports = class HomeController {

  constructor(ctx) {
    this.ctx = ctx;
  }

  * generatorFunction(...args) {
    this.ctx.body = 'done';
    return args;
  }

  async asyncFunction(...args) {
    this.ctx.body = 'done';
    return args;
  }
};
