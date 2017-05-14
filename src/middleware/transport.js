import { putter, multConnect } from './csp'
import { flattenToObj, mapOverKeys, has } from '../utils'

function empty() {
  return {}
}

let createActions = channels =>
  flattenToObj(mapOverKeys(channels, k => ({ [k]: putter(channels[k]) })))

let createSubscriptions = channels =>
  flattenToObj(
    mapOverKeys(channels, k => {
      let mult = multConnect(k, channels)
      return mult && { [k]: mult }
    })
  )

let createTransport = ({ createOuttake = empty, createIntake = empty }) => {
  let outtake = createOuttake(), intake = createIntake(), actions, subscribe
  actions = !has('actions')(outtake) && createActions(outtake)
  subscribe = !has('subscribe')(outtake) && createSubscriptions(outtake)
  Object.assign(outtake, actions && { actions }, subscribe && { subscribe })
  actions = !has('actions')(intake) && createActions(intake)
  Object.assign(intake, actions && { actions })
  return { intake, outtake }
}

export { createTransport as default, createActions, createSubscriptions }
