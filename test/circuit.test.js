import React from 'react'
import ReactTestUtils from 'react-dom/test-utils'
import assert from 'assert'
import { chan, go, putAsync, takeAsync, poll, offer, CLOSED, NO_VALUE } from 'js-csp'
import { eq, neq, oeq, oneq, mock } from './helpers'
import { Circuit } from '../src'

describe('Circuit', function() {
  let R, C, bootstrap, app, refHandler
  let mountState = { x: true },
    services = {},
    transport = {},
    refState = { z: true }
  let init = () => {
    app = mock(React.createElement('div'))
    bootstrap = mock({ app, services, transport })
    refHandler = mock(refState)
    C = <Circuit>{bootstrap}</Circuit>
  }
  beforeEach(function() {
    init()
    R = ReactTestUtils.createRenderer()
  })
  it('should render child with new state and previous state', function() {
    let newState = { x: false }
    let assert_renderCircuit = mi => {
      eq(bootstrap.mock.calls.length, 1)
      eq(app.mock.calls.length, 1)
      let renderCircuit = bootstrap.mock.calls[0][0]
      renderCircuit(() => mountState)
      eq(app.mock.calls.length, 2)
      eq(app.mock.calls[1][0], mountState)
      renderCircuit(() => newState)
      eq(app.mock.calls.length, 3)
      eq(app.mock.calls[2][0], newState)
      eq(app.mock.calls[2][1], mountState)
    }
    R.render(C)
    let instance = R.getMountedInstance()
    assert_renderCircuit(instance)
  })
  it('should not rerender if state has not changed', function() {
    let newState = { x: false }
    R.render(C)
    let renderCircuit = bootstrap.mock.calls[0][0]
    renderCircuit(() => mountState)
    eq(app.mock.calls.length, 2)
    renderCircuit(() => newState)
    eq(app.mock.calls.length, 3)
    renderCircuit(() => newState)
    eq(app.mock.calls.length, 3)
  })
  it('should always rerender on force update with prevState and newState equal', function() {
    let newState = { x: false }
    R.render(C)
    let instance = R.getMountedInstance()
    let renderCircuit = bootstrap.mock.calls[0][0]
    renderCircuit(() => newState)
    eq(app.mock.calls.length, 2)
    eq(app.mock.calls[1][0], newState)
    eq(app.mock.calls[1][1], void 0)
    instance.forceUpdate()
    eq(app.mock.calls.length, 3)
    eq(app.mock.calls[2][0], newState)
    eq(app.mock.calls[2][1], newState)
  })
  it('setting app state during mount should invoke publisher (in the same render)', function() {
    let propsX = { dummy: true },
      args = [{}]
    let updater = () => mountState,
      publisher = mock()
    let assert_publisher = mountedInstance => {
      eq(publisher.mock.calls.length, 1)
      oeq(publisher.mock.calls[0][0], mountState)
      eq(publisher.mock.calls[0][1], args[0])
    }
    let assert_child = mountedInstance => {
      eq(app.mock.calls.length, 1)
      oeq(app.mock.calls[0][0], mountState)
    }
    bootstrap = (renderCircuit, ref, ctx) => {
      assert(ctx)
      renderCircuit(updater, publisher, args)
      return { app, transport, services }
    }
    C = <Circuit x={propsX}>{bootstrap}</Circuit>
    R.render(C)
    let instance = R.getMountedInstance()
    assert_publisher(instance)
    assert_child(instance)
  })
  it('refHandler should keep track of its last return value', function() {
    let assert_refHandler = mountedInstance => {
      let registerRefHandler = bootstrap.mock.calls[0][1]
      let h = registerRefHandler(refHandler, services, transport)
      let ref = {}
      h(ref)
      eq(refHandler.mock.calls.length, 1)
      eq(refHandler.mock.calls[0][0], ref)
      assert(!refHandler.mock.calls[0][1])
      eq(refHandler.mock.calls[0][2], services)
      eq(refHandler.mock.calls[0][3], transport)
      eq(mountedInstance.refState, refState)
    }
    R.render(C)
    let instance = R.getMountedInstance()
    assert_refHandler(instance)
  })
  it('should cleanup internal state on unmount', function() {
    let newState = { x: false }
    R.render(C)
    let instance = R.getMountedInstance()
    let renderCircuit = bootstrap.mock.calls[0][0]
    renderCircuit(() => mountState)
    renderCircuit(() => newState, mock())
    assert(instance.prevState)
    assert(instance.publishers)
    instance.componentWillUnmount()
    assert(!instance.prevState)
    assert(!instance.publishers)
  })
  it('should invoke supplied cleanup function on unmount', function() {
    let cleanup = mock(),
      bootstrap = () => ({ app, cleanup })
    R.render(<Circuit>{bootstrap}</Circuit>)
    let instance = R.getMountedInstance()
    eq(cleanup.mock.calls.length, 0)
    instance.componentWillUnmount()
    eq(cleanup.mock.calls.length, 1)
  })
})
