import {
  chan,
  go,
  spawn,
  take,
  poll,
  putAsync,
  operations as ops,
  Channel,
  NO_VALUE,
  CLOSED
} from 'js-csp'
import Message from '../message'
import { isFn, invokeFn } from '../utils'

function noop() {}

let delayOrNot = (fn, delay = -1) => (delay >= 0 ? setTimeout(fn, delay) : fn())
let tryClose = (c, delay) => c && (c.closed || !!delayOrNot(() => c.close(), delay))
let tryCloseAllKeys = handles => Object.keys(handles).forEach(k => tryClose(handles[k]))
export let tryCloseAll = handles => handles.forEach(tryCloseAllKeys)

export let putter = (c, { proxy, delay, close, closeDelay, asis } = {}) => msg => {
  if (!c.closed) {
    let closeAction = close && tryClose.bind(null, c, closeDelay)
    let wrapped = !asis && Message.wrap(msg)
    let targetc = proxy && !proxy.closed ? proxy : c
    let action = putAsync.bind(null, targetc, wrapped || msg, closeAction)
    delayOrNot(action, delay)
  }
  return msg
}

function* singleTaker(c) {
  let msg = poll(c)
  if (msg === NO_VALUE) msg = yield take(c)
  return msg
}

function* taker(c, fn) {
  let msg = poll(c)
  if (msg instanceof Channel) msg = poll(msg)
  fn(msg)
  while (true) {
    msg = yield take(c)
    if (msg === CLOSED) {
      break
    }
    if (msg instanceof Channel) msg = yield go(singleTaker, [msg])
    fn(msg)
  }
}

function* multiTaker(chs, fn) {
  while (true) {
    let msg = []
    for (let i = 0; i < chs.length; i++) msg[i] = yield chs[i]
    if (msg.indexOf(CLOSED) > -1) break
    else fn(msg)
  }
}

let selectPoller = c => {
  let res = []
  if (Array.isArray(c)) res = [multiTaker, Message.nextParseArray]
  else if (isFn(c)) res = [c]
  else if (c) res = [taker, Message.next]
  return res
}

export let beginPolling = (actions, errorHandler, channels) => {
  let polling = Object.keys(actions).map(key => {
    let c = channels[key],
      cbs = [].concat(actions[key]),
      [next, err = errorHandler || next] = cbs
    let [poller, nextHandler] = selectPoller(c)
    if (poller) {
      poller = nextHandler ? poller(c, nextHandler.bind(null, next, err)) : poller(next, err)
      spawn(poller)
    }
    return { [key]: poller }
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

export let multConnect = (key, outlets) => {
  let outlet = outlets[key],
    proxy = key.slice(-1) === '$' && chan(1),
    msg = NO_VALUE
  let multHandle = pollThenTap(key, multTapper(outlet))
  if (!proxy) return multHandle
  let wrapMultHandle = (next, err = next) => {
    if (msg === NO_VALUE && !proxy.closed) {
      msg = poll(proxy)
      proxy.close()
    }
    let handle = multHandle(next, err)
    Message.next(next, err, msg)
    return handle
  }
  return Object.assign(wrapMultHandle, { proxy })
}

export let endPolling = (pollingHandlers, keys) => {
  if (pollingHandlers) {
    keys = keys || Object.keys(pollingHandlers)
    let actions = keys.map(key => {
      let { return: end } = pollingHandlers[key] || {}
      return end ? end.bind(pollingHandlers[key]) : noop
    })
    return setTimeout(() => actions.forEach(invokeFn))
  }
}
