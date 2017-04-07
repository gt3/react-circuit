import { beginPolling, endPolling } from '../middleware/csp'
import { firstHas, isFn } from '../utils'
import {
  getHandlerFormatters,
  deriveHandlers,
  handlerMapper,
  wrapHandlers
} from './shared'

let handlerValidator = target => {
  let find = firstHas(target)
  return key => key !== 'actions' ? isFn(find(key)) : void 0
}

function wrapProcessHandler(args, handlers) {
  let [next, err] = handlers
  let newHandler = updater => msg => updater(msg, ...args)
  return [newHandler(next), err && newHandler(err)]
}

function wrapRenderProcessHandler(renderApp, args, handlers) {
  let [next, err, next$, err$] = handlers
  let newHandler = (updater, publisher) =>
    msg => renderApp(updater, publisher, [msg, ...args])
  return [newHandler(next, next$), err && newHandler(err, err$)]
}

let getHandlerWrapper = (isRenderP, renderApp, args) =>
  isRenderP
    ? wrapRenderProcessHandler.bind(null, renderApp, args)
    : wrapProcessHandler.bind(null, args)

export let makeRefs = instance => {
  let { props, context } = instance
  let find = firstHas(instance, props, context)
  let intake = find('intake'), handlers = find('handlers')
  let renderApp = firstHas(instance, props)('renderApp'),
    isRenderP = !!renderApp
  if (isFn(intake)) intake = intake(context.intake)
  if (!handlers) {
    let formatters = getHandlerFormatters(isRenderP)
    let validator = handlerValidator(instance)
    let mapper = handlerMapper(validator, formatters)
    handlers = deriveHandlers(intake, instance, mapper, validator)
  }
  if (isRenderP && !isFn(renderApp)) renderApp = context.renderApp
  let handlerWrapper = getHandlerWrapper(isRenderP, renderApp, [
    props,
    context
  ])
  handlers = wrapHandlers(handlers, handlerWrapper)
  return { intake, handlers }
}

export let subscriber = ({ intake, handlers }) =>
  beginPolling(handlers, null, intake)

export let unsubscriber = endPolling
