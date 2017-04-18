import assert from 'assert'
import { NO_VALUE, CLOSED } from 'js-csp'
import { eq, neq, oeq, oneq } from './helpers'
import Message from '../src/message'

describe('Message', function() {
  describe('factory methods pass, fail should create new Message instances', function() {
    it('#pass', function() {
      let x = {}
      assert(Message.pass(true).passed)
      eq(Message.pass(true).value, true)
      assert(Message.pass(x).passed)
      eq(Message.pass(x).value, x)
      assert(Message.pass().passed)
      eq(Message.pass().errorMessage, '')
      assert(new Message().passed)
      assert(new Message(null, x).passed)
      eq(new Message(null, x).value, x)
    })
    it('#fail', function() {
      let msg = 'xxx', err = new Error(msg)
      assert(!Message.fail().passed)
      assert(!Message.fail(msg).passed)
      eq(Message.fail(msg).errorMessage, msg)
      oeq(Message.fail(err).error, err)
    })
  })
  describe('#wrap should wrap and identify provided value based on its type', function() {
    it('wrap pass/fail', function() {
      let msg = 'xxx', err = new Error(msg)
      assert(!Message.wrap().passed)
      assert(Message.wrap(true).passed)
      eq(Message.wrap(true).value, true)
      assert(!Message.wrap(err).passed)
      oeq(Message.wrap(err).error, err)
      assert(Message.wrap(false).passed)
      assert(Message.wrap(null).passed)
      assert(Message.wrap('').passed)
      assert(Message.wrap(0).passed)
      assert(!Message.wrap(undefined).passed)
      assert(!Message.wrap(NaN).passed)
    })
    it('wrap exactly once', function() {
      let m = Message.pass(), merr = Message.fail()
      oeq(Message.wrap(m), m)
      oeq(Message.wrap(merr), merr)
    })
  })
  describe('#next should process callback based on message type', function() {
    let getSuccessNext = done => {
      let success = m => done(), err = assert.ifError
      return Message.next.bind(Message, success, err)
    }
    let getFailureNext = done => {
      let success = assert.ifError, err = m => done()
      return Message.next.bind(Message, success, err)
    }
    let getNoop = done => {
      let noop = assert.ifError
      return Message.next.bind(Message, noop, noop)
    }
    it('success#1', function(done) {
      getSuccessNext(done)(Message.pass())
    })
    it('success#2', function(done) {
      getSuccessNext(done)({ x: 'xxx' })
    })
    it('failure#1', function(done) {
      getFailureNext(done)(Message.fail())
    })
    it('failure#2', function(done) {
      getFailureNext(done)(new Error('xxx'))
    })
    it('noop NO_VALUE', function(done) {
      getNoop(done)(NO_VALUE)
      setTimeout(done, 0)
    })
    it('noop CLOSED', function(done) {
      getNoop(done)(CLOSED)
      setTimeout(done, 0)
    })
  })
  describe('#nextParseArray should process callback based on type of array elements', function() {
    let getSuccessNext = done => {
      let success = m => done(), err = assert.ifError
      return Message.nextParseArray.bind(Message, success, err)
    }
    let getFailureNext = done => {
      let success = assert.ifError, err = m => done()
      return Message.nextParseArray.bind(Message, success, err)
    }
    let getNoop = () => {
      let noop = assert.ifError
      return Message.nextParseArray.bind(Message, noop, noop)
    }
    it('success#1', function(done) {
      getSuccessNext(done)(Message.pass())
    })
    it('success#2', function(done) {
      getSuccessNext(done)([Message.pass()])
    })
    it('success#3', function(done) {
      getSuccessNext(done)([true, NO_VALUE])
    })
    it('failure#1', function(done) {
      getFailureNext(done)([Message.fail()])
    })
    it('failure#2', function(done) {
      getFailureNext(done)([true, Message.fail()])
    })
    it('noop CLOSED', function(done) {
      getNoop()([true, CLOSED])
      setTimeout(done, 0)
    })
    it('noop NO_VALUE', function(done) {
      getNoop()([NO_VALUE])
      setTimeout(done, 0)
    })
  })
})
