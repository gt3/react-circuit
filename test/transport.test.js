import assert from 'assert'
import { chan, go, putAsync, takeAsync, CLOSED } from 'js-csp'
import { eq, neq, oeq, oneq, mock } from './helpers'
import { createTransport } from '../src'

describe('#createTransport', function() {
  let outtake = { t1: chan(), x: chan() }, intake = { p1: chan(), x: chan() }
  let oKeys = Object.keys(outtake), iKeys = Object.keys(intake)
  let createOuttake, createIntake
  beforeEach(function() {
    createOuttake = mock(outtake)
    createIntake = mock(intake)
  })
  it('call w/o providers should return empty object', function() {
    let { intake, outtake } = createTransport({})
    assert(intake && intake.actions)
    assert(outtake && outtake.actions && outtake.subscribe)
  })
  it('should use default providers to generate actions, subscribe actions', function() {
    let { intake, outtake } = createTransport({ createOuttake, createIntake })
    oeq(Object.keys(intake.actions), iKeys)
    oeq(Object.keys(outtake.actions), oKeys)
    oeq(Object.keys(outtake.subscribe), oKeys)
  })
  it('should not overwrite custom actions, subscribe', function() {
    let i = { actions: {} }, o = { actions: {}, subscribe: {} }
    let { intake, outtake } = createTransport({
      createIntake: () => i,
      createOuttake: () => o
    })
    eq(intake.actions, i.actions)
    eq(outtake.actions, o.actions)
    eq(outtake.subscribe, o.subscribe)
  })
})
