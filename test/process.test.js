import React from 'react';
import ReactTestUtils from 'react-addons-test-utils';
import assert from 'assert';
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
} from 'js-csp';
import { eq, neq, oeq, oneq, mock } from './helpers';
import { Process } from '../src';
import Message from '../src/message';

describe('RenderCircuitProcess', function() {
  let R, C, CNoSubscribe;
  let inch, inch2, intake, h1, h2, h3, p1, p2, state, errState;
  let init = () => {
    state = { x: [true], y: [false] };
    errState = Message.fail('xxx', state);
    inch = chan(1);
    inch2 = chan(1);
    intake = { inc: inch, dec: inch2 };
    h1 = mock(null);
    h2 = mock(null);
    h3 = mock(null);
    p1 = mock(state.x);
    p2 = mock(state.y);
    C = class extends Process {
      inc = h1;
      inc$ = p1;
      incError = h2;
      incError$ = p2;
      dec = h3;
      get renderCircuit() {
        return (fn, fnPub) => fn(fnPub);
      }
      get intake() {
        return intake;
      }
    };
    C.contextTypes = {};
    CNoSubscribe = class extends Process {
      get renderCircuit() {
        return true;
      }
      componentWillMount() {}
    };
    CNoSubscribe.contextTypes = {};
  };
  beforeEach(function() {
    init();
    R = ReactTestUtils.createRenderer();
  });
  afterEach(function() {
    intake = null;
    C = null;
    CNoSubscribe = null;
    R = null;
  });
  it('shouldComponentUpdate returns false, ensures no rerender', function() {
    R.render(<CNoSubscribe />);
    let instance = R.getMountedInstance();
    instance.shouldComponentUpdate = mock(instance.shouldComponentUpdate());
    instance.render = mock(null);
    instance.setState({});
    eq(instance.shouldComponentUpdate.mock.calls.length, 1);
    eq(instance.render.mock.calls.length, 0);
  });
  it('renderCircuit should be invoked with updater and publisher, handlers should be subscribed to incoming messages', function(done) {
    R.render(<C />);
    go(function*() {
      yield put(inch, state);
      eq(h1.mock.calls.length, 0);
      yield put(inch, errState);
      eq(h1.mock.calls.length, 1);
      eq(h1.mock.calls[0][0](), state.x);
      yield timeout();
      eq(h2.mock.calls.length, 1);
      eq(h2.mock.calls[0][0](), state.y);
      done();
    });
  });
  it('render Process directly with handlers passed as props', function(done) {
    putAsync(inch, state);
    go(function*() {
      eq(h1.mock.calls.length, 0);
      yield put(inch, errState);
      eq(h1.mock.calls.length, 1);
      eq(h1.mock.calls[0][0](), state.x);
      eq(h2.mock.calls.length, 1);
      eq(h2.mock.calls[0][0](), state.y);
      done();
    });
    R.render(
      <Process
        handlers={{ inc: [h1, h2, p1, p2] }}
        intake={intake}
        renderCircuit={(fn, fnPub) => fn(fnPub)}
      />
    );
  });
  it('intake should be read from context when prop.renderCircuit is bool', function(done) {
    let renderCircuit = mock(null);
    R.render(
      <Process
        intake={intake => intake || {}}
        handlers={{ inc: h1 }}
        renderCircuit
      />
    );
    let instance = R.getMountedInstance();
    instance.unsubscribe(); //unsubscribe
    instance.__handles = null; //remove handles
    instance.context = { intake, renderCircuit }; //provide mock renderCircuit in context
    instance.componentWillMount(); //calling mount should subscribe again
    go(function*() {
      eq(renderCircuit.mock.calls.length, 0);
      yield put(inch, state);
      yield timeout(10);
      eq(renderCircuit.mock.calls.length, 1);
      done();
    });
  });
  it('unsubscribe should deactivate matching handlers', function(done) {
    R.render(<C />);
    let instance = R.getMountedInstance();
    instance.unsubscribe(['inc']);
    go(function*() {
      yield timeout();
      yield put(inch, state);
      yield put(inch2, state);
      yield put(inch2, state);
      yield put(inch2, state);
      eq(h1.mock.calls.length, 0);
      eq(h3.mock.calls.length, 2);
      done();
    });
  });
  it('unsubscribe should deactivate all handlers', function(done) {
    R.render(<C />);
    let instance = R.getMountedInstance();
    instance.unsubscribe();
    go(function*() {
      yield timeout();
      yield put(inch, state);
      yield put(inch2, state);
      yield timeout();
      eq(h1.mock.calls.length, 0);
      eq(h3.mock.calls.length, 0);
      done();
    });
  });
});

describe('Process', function() {
  let R, C, CNoSubscribe;
  let inch, intake, h1, h2, state, errState;
  let init = () => {
    state = { x: [true], y: [false] };
    errState = Message.fail('xxx', state);
    inch = chan(1);
    intake = { inc: inch };
    h1 = mock(null);
    h2 = mock(null);
    C = class extends Process {
      inc = h1;
      incError = h2;
      get intake() {
        return intake;
      }
    };
    C.contextTypes = {};
    CNoSubscribe = class extends Process {
      componentWillMount() {}
    };
    CNoSubscribe.contextTypes = {};
  };
  beforeEach(function() {
    init();
    R = ReactTestUtils.createRenderer();
  });
  afterEach(function() {
    intake = null;
    C = null;
    CNoSubscribe = null;
    R = null;
  });
  it('shouldComponentUpdate returns false, ensures no rerender', function() {
    R.render(<CNoSubscribe />);
    let instance = R.getMountedInstance();
    instance.shouldComponentUpdate = mock(instance.shouldComponentUpdate());
    instance.render = mock(null);
    instance.setState({});
    eq(instance.shouldComponentUpdate.mock.calls.length, 1);
    eq(instance.render.mock.calls.length, 0);
  });
  it('handlers should be subscribed to incoming messages', function(done) {
    R.render(<C />);
    go(function*() {
      yield put(inch, state);
      eq(h1.mock.calls.length, 0);
      yield put(inch, errState);
      eq(h1.mock.calls.length, 1);
      eq(h1.mock.calls[0][0], state);
      yield timeout();
      eq(h2.mock.calls.length, 1);
      eq(h2.mock.calls[0][0], errState);
      done();
    });
  });
  it('handlers (passed as props) should be subscribed to incoming messages', function(done) {
    R.render(<Process handlers={{ inc: [h1, h2] }} intake={intake} />);
    go(function*() {
      yield put(inch, state);
      eq(h1.mock.calls.length, 0);
      yield put(inch, errState);
      eq(h1.mock.calls.length, 1);
      eq(h1.mock.calls[0][0], state);
      yield timeout();
      eq(h2.mock.calls.length, 1);
      eq(h2.mock.calls[0][0], errState);
      done();
    });
  });
  it('unsubscribe should deactivate handlers', function(done) {
    R.render(<C />);
    let instance = R.getMountedInstance();
    instance.unsubscribe();
    go(function*() {
      yield timeout();
      yield put(inch, state);
      yield timeout();
      eq(h1.mock.calls.length, 0);
      done();
    });
  });
  it('intake could be a function that gets context.intake as arg', function(done) {
    let createIntake = intakeFromContext => {
      if (intakeFromContext) {
        eq(intakeFromContext, intake);
        setTimeout(done);
      }
      return intake;
    };
    R.render(<Process intake={createIntake} handlers={{}} />);
    let instance = R.getMountedInstance();
    instance.__handles = null; //remove handles
    instance.context = { intake }; //set fake context
    instance.componentWillMount(); //calling mount will call subscribe
  });
  it('reserved keys in intake should be excluded from matching against handlers', function() {
    let P = class extends Process {
      inc = h1;
      actions = h2;
    };
    R.render(<P intake={{ actions: chan(), inc: inch }} />);
    let instance = R.getMountedInstance();
    assert.ok(!instance.__handles.actions);
  });
});
