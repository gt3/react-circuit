import { chan, go, take, timeout, alts, CLOSED } from 'js-csp'
import Message from '../message'
import { putter, multTapper } from './csp'

const defaultOptions = { abandonTimeout: 4000 }
const abandonErrorMsg = 'async task abandoned due to a timeout'
let createMults = (src, n = 2) => Array.from({ length: n }, multTapper(src))

function* serialLoader(fetch, success, error, source, { abandonTimeout }) {
  let msg,
    [block, unblock] = createMults(source),
    startTimer = () => timeout(abandonTimeout)
  let abandoned = meta => error(Message.fail(abandonErrorMsg, meta))
  let processResponse = msg => Message.next(success, error, msg)
  let resume = done => msg => done() && processResponse(msg)
  let cleanup = c => () => !c.closed && (c.close(), true)
  while (((msg = yield take(block)), msg !== CLOSED)) {
    let awaitFetch = chan(), done = cleanup(awaitFetch)
    fetch(msg.value, resume(done))
    const result = yield alts([awaitFetch, startTimer()])
    if (result.channel !== awaitFetch) {
      done(true)
      abandoned(msg.value)
    }
    yield take(unblock)
  }
}

function* parallelLoader(fetch, success, error, source, options) {
  let msg
  while (((msg = yield take(source)), msg !== CLOSED)) {
    let forked = chan(1)
    putter(forked, { close: true, closeDelay: 0 })(msg)
    go(serialLoader, [fetch, success, error, forked, options])
  }
}

const loaders = { serial: serialLoader, parallel: parallelLoader }

export const initializeAsyncSources = (
  loaderKey = 'serial',
  options = defaultOptions
) => (fetch, success, error, ...triggers) =>
  triggers.forEach(c =>
    go(loaders[loaderKey], [fetch, success, error, c, options])
  )
