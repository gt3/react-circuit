import invariant from 'invariant'
import warning from 'warning'
import _shallowCompare from 'react-addons-shallow-compare'
import Message from '../message'
import { pipe, isFn, flattenToObj, mapOverKeys, pipeOverKeys, m2f } from '../utils'

const checkSubdErrMsg = 'Base class cannot be instatitated directly. Subclass to inherit behavior.'
let checkSubd = (base, instance, supress) => {
  let err = !base.prototype.isPrototypeOf(Object.getPrototypeOf(instance))
  if (!supress) invariant(!err, checkSubdErrMsg)
  else warning(!err, checkSubdErrMsg)
  return err
}

let unsetProps = (instance, keys) => {
  return instance && keys ? flattenToObj(keys.map(k => ({ [k]: void 0 })), instance) : instance
}

export { checkSubd, unsetProps }

/* state management utils */

let unwrapState = state => state && state.value
let wrapState = (updater, args, state) => {
  let value = unwrapState(state)
  let nextState = isFn(updater) ? updater.call(null, value, ...args) : updater
  return nextState === value ? state : Message.pass(nextState)
}

let shallowCompare = (instance, nextP, nextS) => {
  if (!instance) return true
  let state = unwrapState(instance.state), props = instance.props
  return _shallowCompare({ state, props }, nextP, unwrapState(nextS))
}

export { wrapState, unwrapState, shallowCompare }

/* process and result handlers */

let errorHandlerFormat = k => (k ? `${k}Error` : '')
let publisherFormat = k => (k ? `${k}$` : '')
let handlerFormatters = [
  x => x,
  errorHandlerFormat,
  publisherFormat,
  pipe(errorHandlerFormat, publisherFormat)
]
let getHandlerFormatters = isRenderP =>
  (isRenderP ? handlerFormatters : handlerFormatters.slice(0, 2))

let deriveHandlers = (source, target, mapper, filter) => {
  invariant(!!source, 'Missing source - could not dervie handlers')
  warning(!!Object.keys(source).length, 'Missing source - call to derive handlers is futile.')
  let makeHandlers = k => ({ [k]: mapper(k) })
  return flattenToObj(pipeOverKeys(source, m2f('filter', filter), m2f('map', makeHandlers)))
}

let handlerMapper = (validator, formatters) => k => formatters.map(f => validator(f(k)))

let wrapHandlers = (handlers, wrapper) => {
  warning(!!Object.keys(handlers).length, 'Missing handlers.')
  return flattenToObj(mapOverKeys(handlers, k => ({ [k]: wrapper([].concat(handlers[k])) })))
}

export {
  getHandlerFormatters,
  deriveHandlers,
  handlerMapper,
  wrapHandlers,
  errorHandlerFormat,
  publisherFormat
}
