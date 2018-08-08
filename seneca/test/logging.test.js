/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')
var Seneca = require('..')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('logging', function() {
  it('happy', function(fin) {
    var capture = make_log_capture()

    Seneca({ log: 'all', internal: { logger: capture } })
      .error(fin)
      .add('a:1', function(m, r) {
        r(null, { x: 1 })
      })
      .act('a:1', function() {
        expect(this.seneca).to.exist()
        this.log({ seen: 'a:1' })
      })
      .ready(function() {
        var log = capture.log.filter(function(entry) {
          return entry.seen
        })
        expect(log[0].seen).to.equal('a:1')
        fin()
      })
  })

  it('basic', function(fin) {
    var capture = make_log_capture()

    Seneca({ log: { basic: 'all' }, internal: { logger: capture } })
      .error(fin)
      .add('a:1', function(m, r) {
        r(null, { x: 1 })
      })
      .act('a:1', function() {
        expect(this.seneca).to.exist()
        this.log({ seen: 'a:1' })
      })
      .ready(function() {
        var log = capture.log.filter(function(entry) {
          return entry.seen
        })
        expect(log[0].seen).to.equal('a:1')
        fin()
      })
  })

  it('shortcuts', function(fin) {
    var log
    var stdout_write = process.stdout.write
    process.stdout.write = function(data) {
      log.push(data.toString())
    }

    function restore(err) {
      process.stdout.write = stdout_write
      fin(err)
    }

    nothing()

    function nothing() {
      log = []
      Seneca()
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function() {
          expect(log.length).to.equal(1)
          quiet()
        })
    }

    function quiet() {
      log = []
      Seneca({ log: 'quiet' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function() {
          expect(log.length).to.equal(0)
          silent()
        })
    }

    function silent() {
      log = []
      Seneca({ log: 'silent' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function() {
          expect(log.length).to.equal(0)
          any()
        })
    }

    function any() {
      log = []
      Seneca({ log: 'any' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function() {
          expect(log.length).above(11)
          all()
        })
    }

    function all() {
      log = []
      Seneca({ log: 'all' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function() {
          expect(log.length).above(11)
          print()
        })
    }

    function print() {
      log = []
      Seneca({ log: 'print' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function() {
          expect(log.length).above(11)
          standard()
        })
    }

    function standard() {
      log = []
      Seneca({ log: 'standard' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function() {
          expect(log.length).to.equal(1)
          do_test()
        })
    }

    function do_test() {
      log = []
      Seneca({ log: 'test' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function() {
          expect(log.length).to.equal(0)
          restore()
        })
    }
  })

  it('test-mode', function(fin) {
    Seneca.test(fin)
      .add('a:1', a1)
      .act('a:1')
      .ready(fin)
  })
})

function a1(msg, reply) {
  reply(null, { x: 1 })
}

function make_log_capture() {
  var capture = function capture() {}

  capture.log = []

  capture.preload = function() {
    var seneca = this
    var so = seneca.options()
    capture.spec = so.log

    return {
      extend: {
        logger: function(seneca, data) {
          capture.log.push(data)
        }
      }
    }
  }

  return capture
}
