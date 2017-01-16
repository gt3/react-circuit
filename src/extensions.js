import { chan, spawn, take, poll, putAsync, operations as ops } from 'js-csp'
import {CLOSED} from './constants'
import Message from './message'

let noop = () => void (0)
let invoke = Function.prototype.call.bind(Function.prototype.call)

let delayOrNot = (fn, delay = -1) => delay >= 0 ? setTimeout(fn, delay) : fn()
let tryClose = (c, delay) => c && (c.closed || !!delayOrNot(() => c.close(), delay))
let tryCloseAllKeys = handles => Object.keys(handles).forEach(k => tryClose(handles[k]))
export let tryCloseAll = (...handles) => {
  if (!handles.length) return tryCloseAllKeys(handles)
  handles.forEach(tryCloseAllKeys)
}
export let putter = (c, close, delay) => msg => {
  if (close) putAsync(c, Message.wrap(msg), () => tryClose(c, delay))
  else putAsync(c, Message.wrap(msg))
  return msg
}

/*** takes */

function* taker(c, fn) {
  fn(poll(c))
  while (true) {
    let msg = yield take(c)
    if (msg === CLOSED) break;
    else fn(msg)
  }
}

export let endPolling = (pollingHandlers, ...keys) => {
  let actions = keys.map(key => {
    let {return: end} = pollingHandlers[key] || {}
    return end ? () => end.call(pollingHandlers[key]) : noop
  })
  return setTimeout(() => actions.forEach(invoke))
}
let endPollingKeys = handles => endPolling(handles, ...Object.keys(handles))
export let endPollingAll = (...handles) => {
  if (!handles.length) return endPollingKeys(handles)
  handles.forEach(endPollingKeys)
}

export let beginPolling = (actions, errorHandler, channels) => {
  let polling = Object.keys(actions).map(key => {
    let c = channels[key], cbs = [].concat(actions[key]), [next, err = errorHandler || next] = cbs
    let nextHandler = Message.next.bind(null, next, err), process = taker(c, nextHandler)
    if (c) spawn(process)
    return { [key]: process }
  })
  return Object.assign({}, ...polling)
}

function setupPolling(key, next, err) {
  let handle = { [key]: chan() }
  beginPolling({ [key]: [next, err] }, null, handle)
  return handle
}

let pollThenTap = (key, tap) => (next, err = next) => {
  let handle = setupPolling(key, next, err)
  tap(handle[key])
  return handle
}

export let multTapper = src => {
  let multHandle = ops.mult(src)
  return (c = chan()) => ops.mult.tap(multHandle, c)
}

const proxyKeySuffix = 'Proxy'
let makeProxyKey = k => (!k || k.endsWith(proxyKeySuffix) ? k : `${k}${proxyKeySuffix}`)

export let multConnect = (key, outlets) => {
  let proxyKey = makeProxyKey(key)
  let proxyChannel = outlets[proxyKey], outlet = outlets[key]
  if (proxyChannel === outlet) return
  let multHandle = pollThenTap(key, multTapper(outlet))
  if (!proxyChannel) return multHandle
  return (next, err = next) => {
    let msg = poll(proxyChannel)
    let handle = multHandle(next, err)
    let callNext = m => {
      putAsync(proxyChannel, m)
      return next(m)
    }
    Message.next(callNext, err, msg)
    return handle
  }
}