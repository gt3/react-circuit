import assert from 'assert'
import { chan, go, putAsync, takeAsync, buffers, CLOSED } from 'js-csp'
import { eq, neq, oeq, oneq } from './helpers'
import { putter } from '../src/middleware/csp'
import { initializeAsyncSources as ias } from '../src/middleware/loaders'
import Message from '../src/message'

let _networkError = new Error('some network error!')
function fetchSync(i, cb) {
  return cb(++i)
}
function fetchAsync(i, cb) {
  return setTimeout(() => cb(++i))
}
function fetchAsyncErr(i, cb) {
  return setTimeout(() => cb(_networkError))
}
let fetchAsyncWait = (wait = 0) => (i, cb) => (wait < 0 ? cb(++i) : setTimeout(() => cb(++i), wait))
let fetchAsyncWaitOnce = (wait = 0) => (i, cb) => {
  wait < 0 ? cb(++i) : setTimeout(() => cb(++i), wait)
  wait = -1
}

describe('data-loader', function() {
  describe('#initializeAsyncSources #serial', function() {
    it('should accept synchronous callbacks', function(done) {
      let c = chan(),
        i = 0
      let success = m => {
        eq(m, i + 1)
        done()
      }
      let failure = m => void 0
      ias()(fetchSync, success, failure, c)
      putter(c, { close: true })(i)
    })
    it('should control processing flow with backpressure support', function(done) {
      let c = chan(4),
        i = 1,
        j
      let success = m => {
        eq(m, ++i)
        if (i === 5) return done()
      }
      let failure = m => void 0
      ias()(fetchAsync, success, failure, c)
      for (j = 1; j < 5; j++) {
        putter(c)(j)
      }
    })
    it('should invoke error callback', function(done) {
      let c = chan()
      let success = m => void 0
      let failure = m => {
        eq(m.error, _networkError)
        done()
      }
      ias()(fetchAsyncErr, success, failure, c)
      putter(c, { close: true })(true)
    })
    it('should timeout, report error, yield to next request', function(done) {
      let c = chan(2),
        failed
      let success = m => {
        assert.ok(failed)
        eq(m, 2 + 1)
        done()
      }
      let failure = m => {
        failed = true
        eq(m.value, 1)
      }
      ias('serial', { abandonAfter: 100 })(fetchAsyncWaitOnce(200), success, failure, c)
      putter(c)(1)
      putter(c)(2)
    })
    it('should run load processes for each source channel', function(done) {
      let c1 = chan(),
        c2 = chan(),
        c3 = chan(),
        c4 = chan(),
        i = 0,
        cnt = 0
      let success = m => {
        eq(m, ++i - cnt)
        if (++cnt === 4) done()
      }
      let failure = m => void 0
      ias()(fetchAsync, success, failure, c1, c2, c3, c4)
      putter(c1, { close: true })(i)
      putter(c2, { close: true })(i)
      putter(c3, { close: true })(i)
      putter(c4, { close: true })(i)
    })
  })
  describe('#initializeAsyncSources #parallel', function() {
    it('should run load processes in parallel each source channel', function(done) {
      let c = chan(5),
        i = 1,
        j
      let success = m => {
        eq(m, ++i)
        if (i === 100) return done()
        else if (i === 5) i = 99
      }
      let failure = m => void 0
      ias('parallel')(fetchAsyncWaitOnce(100), success, failure, c)
      putter(c)(99)
      for (j = 1; j < 5; j++) {
        putter(c)(j)
      }
    })
  })
})
