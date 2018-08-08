// © Copyright IBM Corporation 2016,2017.
// Node module: microgateway
// LICENSE: Apache 2.0, https://www.apache.org/licenses/LICENSE-2.0

'use strict';

module.exports = function(config) {
  return function(props, context, next) {
    context.policyName = 'mypolicy3';
    next();
  };
};
