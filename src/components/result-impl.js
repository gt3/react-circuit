import { tryCloseAll } from '../middleware/csp'
import { mapOverKeys, firstHas, isFn } from '../utils'
import { getHandlerFormatters, deriveHandlers, handlerMapper, wrapHandlers } from './shared'

function id(s, msg) {
  return msg
}

let handlerValidator = target => {
  let find = firstHas(target)
  return key => isFn(find(key)) || id
}

function wrapResultHandler(setResult, args, handlers) {
  let [next, err] = handlers
  let newHandler = updater => msg => setResult(updater, [msg, ...args])
  return [newHandler(next), err && newHandler(err)]
}

export let makeRefs = instance => {
  let { props, context } = instance
  let find = firstHas(instance, props, context)
  let subscribe = firstHas(instance, props)('subscribe')
  if (isFn(subscribe)) subscribe = subscribe(context.outtake)
  let handlers = find('handlers')
  if (!handlers) {
    let formatters = getHandlerFormatters()
    let validator = handlerValidator(instance)
    let mapper = handlerMapper(validator, formatters)
    handlers = deriveHandlers(subscribe, instance, mapper)
  }
  let handlerWrapper = wrapResultHandler.bind(null, instance.setResult, [props, context])
  handlers = wrapHandlers(handlers, handlerWrapper)
  return { subscribe, handlers }
}

export let subscriber = ({ subscribe, handlers }) => {
  return mapOverKeys(subscribe, k => subscribe[k](...handlers[k]))
}

export let closeHandles = tryCloseAll
