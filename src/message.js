import {NO_VALUE, CLOSED} from './constants'
const checkString = s => !!s.substr
const defaultError = new Error('Unidentified error')
const isErroneous = v => (!v && (v !== 0 && v !== '')) || v instanceof Error

class MessageDetails {
  constructor(error, value = {}) {
    error = error && checkString(error) ? new Error(error) : error
    Object.assign(this, { error, value })
  }
  get errorMessage() { return this.error ? this.error.message : '' }
  get passed() { return !this.error }
}

class Message extends MessageDetails {
  static pass(value) { return new Message(null, value) }
  static fail(err, value) { return new Message(err || defaultError, value) }
  static wrap(value) {
    return (value instanceof Message)
      ? value : isErroneous(value)
        ? Message.fail(value) : Message.pass(value)
  }
  static next(cb, errorCb, msg) {
    if (msg === NO_VALUE || msg === CLOSED) return
    let wrapped = Message.wrap(msg), useWrapped = cb === errorCb && wrapped
    return wrapped.passed ? cb(useWrapped || wrapped.value) : errorCb(wrapped)
  }
  //toString() { return `Message: ${this.passed ? JSON.stringify(this.value) : this.errorMessage}` }
}

export default Message