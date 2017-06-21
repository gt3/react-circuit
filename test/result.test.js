import React, { Component, PropTypes } from 'react'
import ReactTestUtils from 'react-dom/test-utils'
import assert from 'assert'
import {
  go,
  chan,
  put,
  putAsync,
  takeAsync,
  poll,
  offer,
  timeout,
  CLOSED,
  NO_VALUE
} from 'js-csp'
import { eq, neq, oeq, oneq, mock } from './helpers'
import { Result, createSubscriptions } from '../src'
import { subscriber, createRefs } from '../src/components/result-impl'
import Message from '../src/message'

describe('Result', function() {
  let R, child, C
  let outtake, state, errState, subscribe
  let init = () => {
    state = { t: true, f: false }
    errState = Message.fail('xxx', state)
    outtake = { res: chan(), res1: chan(1) }
    //subscribe = {res: multConnect('res', outtake), res1: multConnect('res1', outtake)}
    subscribe = createSubscriptions(outtake)
    child = mock(null)
    C = <Result subscribe={subscribe} children={child} />
  }
  beforeEach(function() {
    init()
    R = ReactTestUtils.createRenderer()
  })
  it('child should be rendered with value of initialResult prop', function() {
    R.render(<Result initialResult={state} children={child} subscribe={{}} />)
    eq(child.mock.calls.length, 1)
    eq(child.mock.calls[0][0], state)
  })
  it('child should be rendered with value returned from initialResult function prop', function() {
    let init = mock(state)
    R.render(
      <Result initialResult={init} children={child} subscribe={subscribe} />
    )
    eq(init.mock.calls.length, 1)
    eq(init.mock.calls[0][2].initialResult, init)
    eq(child.mock.calls.length, 1)
    eq(child.mock.calls[0][0], state)
  })
  it('should use default child function if none is provided', function() {
    R.render(<Result initialResult={state} subscribe={{}} />)
    let instance = R.getMountedInstance()
    eq(instance.result, state)
  })
  it('subscriber should register handlers with subscribe', function() {
    let subscribe = { x1: mock(), x2: mock() }
    let x1h = mock(), x1herr = mock(), x2h = mock()
    let handlers = { x1: [x1h, x1herr], x2: [x2h] }
    subscriber({ subscribe, handlers })
    eq(subscribe.x1.mock.calls[0][0], x1h)
    eq(subscribe.x1.mock.calls[0][1], x1herr)
    eq(subscribe.x2.mock.calls[0][0], x2h)
  })
  it('default handler should update component state', function(done) {
    let c = outtake.res, err = new Error('xxx')
    putAsync(c, state)
    go(function*() {
      eq(child.mock.calls.length, 0)
      yield put(c, err)
      eq(child.mock.calls.length, 1)
      eq(child.mock.calls[0][0], state)
      yield put(c, {})
      eq(child.mock.calls.length, 2)
      eq(child.mock.calls[1][0].error, err)
      done()
    })
    R.render(C)
  })
  it('custom handler should update component state', function(done) {
    let c = outtake.res
    class CCustomHandlers extends Result {
      res = (state, m) => {
        return m.t
      }
      resError = (state, m) => {
        return m.value.f
      }
      get subscribe() {
        return subscribe
      }
    }
    let C = <CCustomHandlers children={child} />
    putAsync(c, state)
    go(function*() {
      eq(child.mock.calls.length, 0)
      yield put(c, errState)
      eq(child.mock.calls.length, 1)
      eq(child.mock.calls[0][0], true)
      yield put(c, {})
      eq(child.mock.calls.length, 2)
      eq(child.mock.calls[1][0], false)
      done()
    })
    R.render(C)
  })
  it('custom handler should be called with state, msg, props, context', function(
    done
  ) {
    putAsync(outtake.res1, state)
    let res1 = (s, m, props, ctx) => {
      oeq(m.value, state)
      eq(props.x, 1)
      assert(ctx)
      setTimeout(done)
      return m.t
    }
    let res = () => false
    R.render(
      <Result
        handlers={{ res, res1 }}
        subscribe={subscribe}
        x={1}
        children={child}
      />
    )
  })
  it('subscribe could be a function that gets context.subscribe as arg', function(
    done
  ) {
    let subscribeFn = outtake => {
      if (outtake) {
        eq(outtake.subscribe, subscribe)
        setTimeout(done)
      }
      return outtake ? outtake.subscribe : {}
    }
    R.render(<Result subscribe={subscribeFn} />)
    let instance = R.getMountedInstance()
    instance.componentWillUnmount() //close handles
    instance.__handles = null //remove handles
    instance.context = { outtake: { subscribe } } //set fake context
    instance.componentWillMount() //calling mount will call subscribe
  })
  it('unmount should close subscribed handles', function(done) {
    let c = outtake.res
    R.render(C)
    let instance = R.getMountedInstance()
    go(function*() {
      yield put(c, state)
      yield timeout()
      eq(child.mock.calls.length, 1)
      yield put(c, state)
      R.unmount()
      yield timeout()
      eq(child.mock.calls.length, 1)
      done()
    })
  })
})
