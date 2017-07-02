import assert from 'assert'
import { chan, go, putAsync, takeAsync, CLOSED } from 'js-csp'
import { eq, neq, oeq, oneq, mock } from './helpers'
import * as u from '../src/utils'

describe('utils', function() {
  it('pipe', function() {
    let inc = i => i + 1,
      sq = i => i * i
    eq(u.pipe(null, inc, sq)(1), 4)
    eq(u.pipe(sq, null, inc)(1), 2)
    eq(u.pipe(null)(1), 1)
  })
  it('m2f', function() {
    let inc = i => i + 1,
      ev = i => i % 2
    eq(u.m2f('map', null), null)
    oeq(u.m2f('map', inc)([1, 2]), [1, 2].map(inc))
    oeq(u.m2f('filter', ev)([2, 3, 4]), [2, 3, 4].filter(ev))
  })
  it('flattenToObj', function() {
    let a = [],
      a2 = [{ x: 1 }, { y: 2 }],
      a3 = [{ x: { y: 1 } }]
    let o = {},
      o2 = { x: 1, y: 2 },
      o3 = { x: { y: 1 } }
    oeq(u.flattenToObj(a), o)
    oeq(u.flattenToObj(a2), o2)
    oeq(u.flattenToObj(a3), o3)
  })
  it('pipeOverKeys', function() {
    let a = [1, 2, 3],
      o = { 0: 1, 1: 2, 2: 3 }
    let join = x => x.join('-'),
      split = x => x.split('-')
    let r = '0-1-2'
    eq(u.pipeOverKeys(a, join), r)
    eq(u.pipeOverKeys(a, join, split, join), r)
  })
  it('mapOverKeys', function() {
    let a = [1, 2, 3],
      o = { 0: 1, 1: 2, 2: 3 },
      fn = x => x * 2
    let r = [0, 2, 4]
    oeq(u.mapOverKeys(a, fn), r)
    oeq(u.mapOverKeys(o, fn), r)
  })
  it('has', function() {
    let o = { z: 3 },
      o1 = Object.create(o, { x: { value: 1 } }),
      o2 = Object.create(o1, { y: { value: 2 } })
    assert.ok(u.has('y')(o2))
    assert.ok(u.has('x', true)(o2))
    assert.ok(!u.has('x', false)(o2))
    assert.ok(!u.has('z', false)(o2))
    assert.ok(!u.has('z', true)(o2))
    eq(u.has('x')(null), null)
  })
  it('firstHas', function() {
    let o = [{}, { x: 1 }, { x: 2 }]
    eq(u.firstHas(...o)('x'), 1)
    eq(u.firstHas(...o.reverse())('x'), 2)
    eq(u.firstHas()('x'), void 0)
  })
  it('isFn', function() {
    function fn() {}
    eq(u.isFn(fn), fn)
    eq(u.isFn(), undefined)
    eq(u.isFn(null), undefined)
  })
  it('isStr', function() {
    eq(u.isStr('xxx'), true)
    eq(u.isStr(''), true)
    eq(u.isStr(new String()), true)
    eq(u.isStr(String('')), true)
    eq(u.isStr(null), false)
    eq(u.isStr(undefined), false)
    eq(u.isStr({}), false)
    eq(u.isStr(1), false)
    eq(u.isStr(Error(' ')), false)
  })
})
