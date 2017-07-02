import { putter, multConnect } from './csp'
import { flattenToObj, mapOverKeys, has } from '../utils'

const empty = () => ({})

let createActions = (chans, getOptions = empty) =>
  flattenToObj(mapOverKeys(chans, k => ({ [k]: putter(chans[k], getOptions(k)) })))

let createOutActions = (chans, subscribe) =>
  createActions(chans, k => ({ proxy: subscribe[k].proxy }))

let createSubscriptions = chans =>
  flattenToObj(
    mapOverKeys(chans, k => {
      let mult = multConnect(k, chans)
      return mult && { [k]: mult }
    })
  )

let createTransport = ({ createOuttake = empty, createIntake = empty }) => {
  let outtake = createOuttake(),
    intake = createIntake(),
    actions,
    subscribe
  subscribe = !has('subscribe')(outtake) && createSubscriptions(outtake)
  //todo: warn if outtake.actions already there, overwrite outtake.actions anyway
  actions = !has('actions')(outtake) && createOutActions(outtake, subscribe)
  Object.assign(outtake, actions && { actions }, subscribe && { subscribe })
  actions = !has('actions')(intake) && createActions(intake)
  Object.assign(intake, actions && { actions })
  return { intake, outtake }
}

export { createTransport as default, createActions, createOutActions, createSubscriptions }
