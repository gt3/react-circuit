import assert from 'assert'
import { chan, go, put, putAsync, takeAsync, offer, timeout, CLOSED } from 'js-csp'
import { eq, neq, oeq, oneq, mock } from './helpers'
import { multConnect, beginPolling, putter, tryCloseAll, endPolling } from '../src/middleware/csp'
import Message from '../src/message'

describe('extensions', function() {
  describe('#tryCloseAll', function() {
    it('should close all channels in the given channel map object', function(done) {
      let c1 = chan(1),
        c2 = chan(1),
        co = { c1, c2 },
        i = 0
      putter(c1)(++i)
      putter(c2)(++i)
      takeAsync(c2, v => {
        eq(v.value, 2)
        tryCloseAll([co])
        assert(c1.closed)
        assert(c2.closed)
        done()
      })
    })
    it('should close channels identified by key', function(done) {
      let c1 = chan(1),
        c2 = chan(1),
        co = { c1, c2 },
        i = 0
      putter(c1)(++i)
      putter(c2)(++i)
      takeAsync(c2, v => {
        eq(v.value, 2)
        tryCloseAll([{ c1 }], ['c1', 'zzzzz'])
        assert(c1.closed)
        assert(!c2.closed)
        done()
      })
    })
  })
  describe('#multConnect', function() {
    it('should attach multiple receivers to one channel', function(done) {
      let takePool = { x: chan() },
        subscribe = multConnect('x', takePool)
      let fn = mock()
      putAsync(takePool.x, true)
      let h1 = subscribe(fn)
      let h2 = subscribe(fn)
      go(function*() {
        yield put(takePool.x, true)
        eq(fn.mock.calls.length, 2)
        eq(fn.mock.calls[0][0].value, true)
        eq(fn.mock.calls[1][0].value, true)
        done()
      })
    })
    it('should invoke error handler when mult receives error message', function(done) {
      let takePool = { x: chan() },
        subscribe = multConnect('x', takePool)
      let err = new Error('call done on error cb')
      let fn = mock(),
        fnErr = mock()
      putAsync(takePool.x, err)
      let h1 = subscribe(fn, fnErr)
      go(function*() {
        yield put(takePool.x, true)
        eq(fnErr.mock.calls.length, 1)
        eq(fnErr.mock.calls[0][0].error, err)
        done()
      })
    })
  })
  describe('#multConnect with proxy', function() {
    it('should invoke next callback with message from proxy channel (per naming convention)', function(
      done
    ) {
      let takePool = { x$: chan() }
      let i = 0,
        msg = { x: 'xxx' },
        fn = m => {
          oeq(m.value, msg)
          ++i
        }
      let subscribe = multConnect('x$', takePool)
      assert(subscribe.proxy)
      assert(!subscribe.proxy.closed)
      offer(subscribe.proxy, msg)
      let h1 = subscribe(fn)
      assert(subscribe.proxy.closed)
      let h2 = subscribe(fn)
      setTimeout(() => {
        oeq(i, 2)
        done()
      })
    })
  })
  describe('#beginPolling', function() {
    it('should poll and call handler synchronously when data is available', function(done) {
      let c = chan(1),
        co = { x: c },
        handler = { x: () => ++i },
        i = 0
      putAsync(c, true, () => {
        beginPolling(handler, null, co)
        assert(i)
        done()
      })
    })
    it('keep calling handler as data arrives', function(done) {
      let c = chan(),
        co = { x: c },
        handler = { x: () => ++i },
        i = 0
      beginPolling(handler, null, co)
      putAsync(c, true, () => eq(i, 0))
      putAsync(c, true, () => eq(i, 1))
      putAsync(c, true, () => {
        eq(i, 2)
        done()
      })
    })
    it('multiple handlers for multiple channels', function(done) {
      let co = { x: chan(), y: chan(), z: chan() },
        c = chan()
      let i = 0,
        fn = () => ++i,
        h = { x: fn, y: fn, z: fn }
      putAsync(co.x, true)
      putAsync(co.y, true)
      putAsync(co.z, true, () => putAsync(c, true))
      beginPolling(h, null, co)
      takeAsync(c, () => {
        eq(i, 3)
        done()
      })
    })
    it('#1 should call error handler when error message is returned from channel', function(done) {
      let fn = () => ++i,
        doneOnErr = () => done()
      let c = chan(1),
        co = { x: c },
        handler = { x: [fn, doneOnErr] },
        i = 0
      putAsync(c, new Error('calls done'), () => {
        beginPolling(handler, null, co)
      })
    })
    it('#2 should call error handler when error message is returned from channel', function(done) {
      let fn = () => ++i
      let c = chan(1),
        co = { x: c },
        handler = { x: fn },
        i = 0
      putAsync(c, Message.fail('calls done'), () => {
        beginPolling(handler, () => done(), co)
      })
    })
    it('should return handles to the generator objects created for corresponding actions', function() {
      let co = { x: chan(), y: chan(), z: chan() }
      let i = 0,
        fn = () => ++i,
        h = { x: fn, y: fn, z: fn }
      let handles = beginPolling(h, null, co)
      assert(handles.x)
      assert(handles.y)
      assert(handles.z)
      oeq(Object.keys(handles), Object.keys(h))
    })
    it('should invoke same handler for multiple channels (array)', function(done) {
      let c1 = chan(),
        c2 = chan(),
        co = { x: [c1, c2] }
      let fn = mock()
      let h = { x: fn }
      beginPolling(h, null, co)
      putAsync(c1, 1)
      putAsync(c2, 2)
      go(function*() {
        yield timeout(10)
        eq(fn.mock.calls.length, 1)
        oeq(fn.mock.calls[0][0].value, [1, 2])
        yield put(c1, 3)
        yield put(c2, 4)
        yield timeout(10)
        eq(fn.mock.calls.length, 2)
        oeq(fn.mock.calls[1][0].value, [3, 4])
        done()
      })
    })
    it('should read from channel producing channel', function(done) {
      let c1 = chan(1),
        c2 = chan(1),
        c3 = chan(1),
        co = { x: c1 }
      let fn = mock()
      let h = { x: fn }
      putAsync(c1, c2)
      putAsync(c2, 42)
      putAsync(c3, 43)
      beginPolling(h, null, co)
      go(function*() {
        yield put(c1, c3)
        eq(fn.mock.calls.length, 1)
        oeq(fn.mock.calls[0][0].value, 42)
        yield timeout()
        eq(fn.mock.calls.length, 2)
        oeq(fn.mock.calls[1][0].value, 43)
        done()
      })
    })
    it('should read from multiple channels sequentially', function(done) {
      let c1 = chan(),
        c2 = chan(),
        co = { x: [c1, c2] }
      let fn = mock()
      let h = { x: fn }
      putAsync(c2, 2)
      beginPolling(h, null, co)
      go(function*() {
        yield timeout()
        eq(fn.mock.calls.length, 0)
        yield put(c1, 1)
        yield timeout()
        eq(fn.mock.calls.length, 1)
        oeq(fn.mock.calls[0][0].value, [1, 2])
        done()
      })
    })
    it('should delegate polling to provided generator', function(done) {
      let c = chan(2),
        fnNext = mock(false),
        fnErr = mock()
      function* gen(next, err) {
        err(next(yield c))
        err(next(yield c))
      }
      let cgen = { x: gen },
        handler = { x: [fnNext, fnErr] }
      let handles = beginPolling(handler, null, cgen)
      go(function*() {
        yield put(c, true)
        yield timeout()
        endPolling(handles)
        yield timeout()
        yield put(c, true)
        yield timeout()
        eq(fnNext.mock.calls.length, 1)
        eq(fnNext.mock.calls[0][0], true)
        eq(fnErr.mock.calls.length, 1)
        eq(fnErr.mock.calls[0][0], false)
        done()
      })
    })
    it('closing a polling channel should terminate polling', function(done) {
      let c1 = chan(),
        c2 = chan(),
        co = { x: [c1, c2] }
      let h = { x: assert.fail }
      beginPolling(h, null, co)
      go(function*() {
        yield put(c1, true)
        c2.close()
        yield timeout()
        done()
      })
    })
    it('closing a channel returned by polling channel should not terminate polling', function(
      done
    ) {
      let c1 = chan(1),
        c2 = chan(1),
        c3 = chan(1),
        co = { x: c1 }
      let fn = mock()
      let h = { x: fn }
      putAsync(c2, 42)
      putAsync(c1, c2)
      putAsync(c1, c3)
      putAsync(c1, c2)
      c3.close()
      beginPolling(h, null, co)
      go(function*() {
        yield put(c2, 43)
        eq(fn.mock.calls.length, 1)
        oeq(fn.mock.calls[0][0].value, 42)
        yield timeout(10)
        eq(fn.mock.calls.length, 2)
        oeq(fn.mock.calls[1][0].value, 43)
        done()
      })
    })
  })
  describe('#endPolling', function() {
    it('should end polling for all processes', function(done) {
      let co = { x: chan(), y: chan() }
      let i = 0,
        fn = () => ++i,
        h = { x: fn, y: fn }
      putAsync(co.x, true)
      let handles = beginPolling(h, null, co)
      eq(i, 1)
      let endCheck = function*() {
        endPolling(handles)
        yield timeout()
        putAsync(co.x, true)
        putAsync(co.y, true)
        yield timeout()
        eq(i, 1)
        done()
      }
      go(endCheck)
    })
    it('should end polling for the process identified by provided key', function(done) {
      let co = { x: chan(), y: chan() }
      let i = 0,
        fn = () => ++i,
        h = { x: fn, y: fn }
      putAsync(co.x, true)
      let handles = beginPolling(h, null, co)
      eq(i, 1)
      let endCheck = function*() {
        endPolling(handles, ['y', 'zzzzz'])
        yield timeout()
        putAsync(co.x, true)
        putAsync(co.y, true)
        yield timeout()
        eq(i, 2)
        done()
      }
      go(endCheck)
    })
    it('should not break if handlers is empty object', function() {
      assert.doesNotThrow(() => endPolling({}))
      assert.doesNotThrow(() => endPolling(null))
    })
  })
  describe('#putter', function() {
    it('puts a wrapped message on channel', function(done) {
      let c = chan(),
        msg = { x: 1 }
      takeAsync(c, m => {
        assert(m.passed)
        eq(m.value, msg)
        done()
      })
      putter(c)(msg)
    })
    it('puts message, wraps if required', function(done) {
      let c = chan(),
        msg = Message.pass({ x: 1 })
      takeAsync(c, m => {
        oeq(m, msg)
        done()
      })
      putter(c)(msg)
    })
    it('puts message asis', function(done) {
      let c = chan(),
        msg = { x: 1 }
      takeAsync(c, m => {
        eq(m, msg)
        done()
      })
      putter(c, { asis: true })(msg)
    })
    it('puts message with delay', function(done) {
      let i = 0,
        c = chan(),
        putWithDelay = putter(c, { delay: 100 })
      setTimeout(() => ++i, 20)
      takeAsync(c, m => {
        assert(i > 0)
        assert(m.value)
        done()
      })
      putWithDelay(true)
    })
    it('puts message with delay then closes', function(done) {
      let c = chan(),
        putAndClose = putter(c, { close: true })
      takeAsync(c, m => {
        assert(m.value)
        assert(c.closed)
        done()
      })
      putAndClose(true)
    })
    it('puts message then closes with delay', function(done) {
      let c = chan(),
        putAndClose = putter(c, { close: true, closeDelay: 0 })
      takeAsync(c, m => {
        assert(m.value)
        assert(!c.closed)
        setTimeout(() => {
          assert(c.closed)
          done()
        })
      })
      putAndClose(true)
    })
    it('does not attempt to put on a closed channel', function(done) {
      let c = chan()
      c.close()
      assert(c.closed)
      takeAsync(c, m => eq(m, CLOSED))
      putter(c)(true)
      takeAsync(c, m => m && assert.fail('received msg on closed chan'))
      setTimeout(done)
    })
    it('puts on a proxy channel until closed', function(done) {
      let c = chan(),
        proxy = chan(),
        msg1 = { x: 1 },
        msg2 = { x: 2 }
      let p = putter(c, { proxy }),
        m
      p(msg2)
      go(function*() {
        m = yield c
        eq(m.value, msg1)
        done()
      })
      go(function*() {
        m = yield proxy
        eq(m.value, msg2)
        proxy.close()
        p(msg1)
      })
    })
  })
})
