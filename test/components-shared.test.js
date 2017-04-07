import assert from 'assert';
import { eq, neq, oeq, oneq, mock } from './helpers';
import * as u from '../src/components/shared';

describe('components/shared', function() {
  it('checkSubd', function() {
    let b = class {};
    let c = class extends b {};
    let d = class extends b {};
    assert.throws(() => u.checkSubd(b, new b()), /invariant/i);
    assert.throws(() => assert.ifError(u.checkSubd(b, new b(), true)));
    assert.ifError(u.checkSubd(b, new c()));
    assert.ifError(u.checkSubd(b, new d()));
  });
  it('unwrapState', function() {
    eq(u.unwrapState({ value: 1 }), 1);
    eq(u.unwrapState({}), void 0);
    eq(u.unwrapState(null), null);
  });
  //todo: split into seperate tests
  it('wrapState', function() {
    let o = { x: 1 }, o2 = { x: 2 }, s = { value: o };
    let args = [o2];

    let updater = {};
    let res = u.wrapState(updater);
    eq(res.value, updater);

    updater = () => o;
    res = u.wrapState(updater, [], s);
    eq(res, s);

    updater = mock(o);

    res = u.wrapState(updater, [], s);
    eq(res.value, o);
    eq(updater.mock.calls.length, 1);
    eq(updater.mock.calls[0][0], s.value);

    updater = mock(o);

    res = u.wrapState(updater, args, s);
    eq(res.value, o);
    eq(updater.mock.calls.length, 1);
    eq(updater.mock.calls[0][0], s.value);
    eq(updater.mock.calls[0][1], o2);
  });
  it('unsetProps', function() {
    oeq(u.unsetProps({ x: 1, y: 2 }, ['x', 'y']), {});
    oeq(u.unsetProps({ x: 1, y: 2 }, ['x']), { y: 2 });
    oeq(u.unsetProps({ x: 1, y: 2 }, []), { x: 1, y: 2 });
    oeq(u.unsetProps({ x: 1, y: 2 }), { x: 1, y: 2 });
  });
  it('shallowCompare', function() {
    let props = { x: 1 }, state = u.wrapState({ s: 1 }), o = { props, state };
    eq(u.shallowCompare(o, props, state), false);
    eq(u.shallowCompare(o, { x: 1 }, state), false);
    eq(u.shallowCompare(o, props, { s: 1 }), true);
    eq(u.shallowCompare(null, props, state), true);
    eq(u.shallowCompare({}, props, state), true);
    eq(u.shallowCompare({}, props, null), true);
  });
  it('errorHandlerFormat', function() {
    eq(u.errorHandlerFormat('x'), 'xError');
    eq(u.errorHandlerFormat('Error'), 'ErrorError');
    eq(u.errorHandlerFormat(''), '');
    eq(u.errorHandlerFormat(null), '');
  });
  it('publisherFormat', function() {
    eq(u.publisherFormat('x'), 'x$');
    eq(u.publisherFormat('$'), '$$');
    eq(u.publisherFormat(''), '');
    eq(u.publisherFormat(null), '');
  });
  it('deriveHandlers', function() {
    let v1 = {}, v2 = {}, v3 = {}, v4 = {};
    let s = { v1, v2, v3 }, t = { v2, v3, v4 };
    let m = x => t[x], f = x => x !== 'v3';
    oeq(u.deriveHandlers(s, t, m), { v2, v3 });
    oeq(u.deriveHandlers(s, t, m, f), { v2 });
  });
});
