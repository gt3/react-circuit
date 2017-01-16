import assert from 'assert'
import { chan, go, putAsync, takeAsync, offer, timeout, CLOSED } from 'js-csp'
import { eq, neq, oeq, oneq } from './helpers'
import { Message, multConnect, beginPolling, putter, tryCloseAll, endPolling, endPollingAll } from '../src'

describe('extensions', function () {
  describe('#tryCloseAll', function () {
    it('should close all channels in the given channel map object', function (done) {
      let c1 = chan(1), c2 = chan(1), co = { c1, c2 }, i = 0
      putter(c1)(++i)
      putter(c2)(++i)
      takeAsync(c2, v => {
        eq(v.value, 2)
        tryCloseAll(co)
        assert(c1.closed)
        assert(c2.closed)
        done()
      })
    })
    it('should close all channels passed in as rest params', function (done) {
      let c1 = chan(1), c2 = chan(1), co = { c1, c2 }, i = 0
      putter(c1)(++i)
      putter(c2)(++i)
      takeAsync(c2, v => {
        eq(v.value, 2)
        tryCloseAll({ c1 }, { c2 })
        assert(c1.closed)
        assert(c2.closed)
        done()
      })
    })
  })
  describe('#multConnect', function () {
    it('should attach multiple receivers to one channel', function (done) {
      let takePool = { x: chan() }, subscribe = multConnect('x', takePool)
      let i = 0, msg = { x: 'xxx' }, fn = m => { oeq(m.value, msg); ++i; }
      putAsync(takePool.x, msg)
      let h1 = subscribe(fn)
      let h2 = subscribe(fn)
      putAsync(takePool.x, true, () => {
        eq(i, 2)
        tryCloseAll(takePool, h1, h2)
        done()
      })
    })
    it('should invoke error handler when mult receives error message', function (done) {
      let takePool = { x: chan(1) }, subscribe = multConnect('x', takePool)
      let err = new Error('call done on error cb')
      let i = 0, fn = () => ++i, fnErr = (m) => {
        eq(i, 0)
        oeq(m.error, err)
        tryCloseAll(h1)
        done()
      }
      let h1 = subscribe(fn, fnErr)
      putter(takePool.x, true)(err)
    })
  })
  describe('#multConnect with proxy', function () {
    it('should invoke next callback with message from proxy channel (follow naming convention)', function (done) {
      let takePool = { x: chan(), xProxy: chan(1) }
      let i = 0, msg = { x: 'xxx' }, fn = m => { oeq(m, msg); ++i; }
      let subscribe = multConnect('x', takePool)
      offer(takePool.xProxy, msg)
      let h1 = subscribe(fn)
      let h2 = subscribe(fn)
      let cleanup = () => { oeq(i, 2); tryCloseAll(takePool, h1, h2); done(); }
      setTimeout(cleanup)
    })
  })
  describe('#beginPolling', function () {
    it('should poll and call handler synchronously when data is available', function (done) {
      let c = chan(1), co = { x: c }, handler = { x: () => ++i }, i = 0
      putAsync(c, true, () => {
        beginPolling(handler, null, co)
        assert(i)
        done()
      })
    })
    it('keep calling handler as data arrives', function (done) {
      let c = chan(), co = { x: c }, handler = { x: () => ++i }, i = 0
      beginPolling(handler, null, co)
      putAsync(c, true, () => eq(i, 0))
      putAsync(c, true, () => eq(i, 1))
      putAsync(c, true, () => {
        eq(i, 2)
        done()
      })
    })
    it('multiple handlers for multiple channels', function (done) {
      let co = { x: chan(), y: chan(), z: chan() }, c = chan()
      let i = 0, fn = () => ++i, h = { x: fn, y: fn, z: fn }
      putAsync(co.x, true)
      putAsync(co.y, true)
      putAsync(co.z, true, () => putAsync(c, true))
      beginPolling(h, null, co)
      takeAsync(c, () => {
        eq(i, 3)
        done()
      })
    })
    it('#1 should call error handler when error message is returned from channel', function (done) {
      let fn = () => ++i, doneOnErr = () => done()
      let c = chan(1), co = { x: c }, handler = { x: [fn, doneOnErr] }, i = 0
      putAsync(c, new Error('calls done'), () => {
        beginPolling(handler, null, co)
      })
    })
    it('#2 should call error handler when error message is returned from channel', function (done) {
      let fn = () => ++i
      let c = chan(1), co = { x: c }, handler = { x: fn }, i = 0
      putAsync(c, Message.fail('calls done'), () => {
        beginPolling(handler, () => done(), co)
      })
    })
    it('should return handles to the generator objects created for corresponding actions', function () {
      let co = { x: chan(), y: chan(), z: chan() }
      let i = 0, fn = () => ++i, h = { x: fn, y: fn, z: fn }
      let handles = beginPolling(h, null, co)
      assert(handles.x)
      assert(handles.y)
      assert(handles.z)
      oeq(Object.keys(handles), Object.keys(h))
    })
  })
  describe('#endPollingAll', function () {
    it('should end polling for all requested processes', function (done) {
      let co = { x: chan(), y: chan() }
      let i = 0, fn = () => ++i, h = { x: fn, y: fn }
      putAsync(co.x, true)
      let handles = beginPolling(h, null, co)
      eq(i, 1)
      let endCheck = function* () {
        endPollingAll(handles)
        yield timeout()
        putAsync(co.x, true)
        putAsync(co.y, true)
        yield timeout()
        eq(i, 1)
        done()
      }
      go(endCheck)
    })
  })
  describe('#endPolling', function () {
    it('should end polling for the process identified by provided key', function (done) {
      let co = { x: chan(), y: chan() }
      let i = 0, fn = () => ++i, h = { x: fn, y: fn }
      putAsync(co.x, true)
      let handles = beginPolling(h, null, co)
      eq(i, 1)
      let endCheck = function* () {
        endPolling(handles, 'y')
        yield timeout()
        putAsync(co.x, true)
        putAsync(co.y, true)
        yield timeout()
        eq(i, 2)
        done()
      }
      go(endCheck)
    })
  })
  describe('#putter', function () {
    it('puts a wrapped message on channel', function (done) {
      let c = chan(), msg = { x: 1 }
      takeAsync(c, m => {
        assert(m.passed)
        eq(m.value, msg)
        done()
      })
      putter(c)(msg)
    })
    it('puts message, wraps only if needed', function (done) {
      let c = chan(), msg = Message.pass({ x: 1 })
      takeAsync(c, m => {
        oeq(m, msg)
        done()
      })
      putter(c)(msg)
    })
    it('puts message then closes', function (done) {
      let c = chan(), putAndClose = putter(c, true)
      takeAsync(c, m => {
        assert(m.value)
        assert(c.closed)
        done()
      })
      putAndClose(true)
    })
    it('puts message then closes with delay', function (done) {
      let c = chan(), putAndClose = putter(c, true, 0)
      takeAsync(c, m => {
        assert(m.value)
        assert(!c.closed)
        setTimeout(() => { assert(c.closed); done(); })
      })
      putAndClose(true)
    })
  })
})