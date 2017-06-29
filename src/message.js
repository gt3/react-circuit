import { NO_VALUE, CLOSED } from 'js-csp'
import { isStr } from './utils'

const defaultError = new Error('Unidentified error')
const isErroneous = v =>
  (!v && isNaN(v)) || v instanceof Error || (v instanceof Message && !v.passed)

class MessageDetails {
  constructor(error, value = {}) {
    error = isStr(error) ? new Error(error) : error
    Object.assign(this, { error, value })
  }
  get errorMessage() {
    return this.error ? this.error.message : ''
  }
  get passed() {
    return !this.error
  }
}

class Message extends MessageDetails {
  static pass(value) {
    return new Message(null, value)
  }
  static fail(err, value) {
    return new Message(err || defaultError, value)
  }
  static wrap(value) {
    return value instanceof Message
      ? value
      : isErroneous(value) ? Message.fail(value) : Message.pass(value)
  }
  static next(cb, errorCb, msg) {
    if (msg === NO_VALUE || msg === CLOSED) return
    let wrapped = Message.wrap(msg), useWrapped = cb === errorCb && wrapped
    return wrapped.passed ? cb(useWrapped || wrapped.value) : errorCb(wrapped)
  }
  static nextParseArray(cb, errorCb, msgs) {
    if (!Array.isArray(msgs)) return Message.next(cb, errorCb, msgs)
    if (msgs.indexOf(CLOSED) > -1) return
    if (!msgs.find(m => m !== NO_VALUE)) return
    let wrapped = msgs.find(isErroneous) ? Message.fail(msgs) : Message.pass(msgs)
    return Message.next(cb, errorCb, wrapped)
  }
}

export default Message
