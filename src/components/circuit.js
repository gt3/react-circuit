import { Component, Children, isValidElement, cloneElement } from 'react'
import PropTypes from 'prop-types'
import { wrapState, unwrapState, shallowCompare, unsetProps } from './shared'

export default class Circuit extends Component {
  get appState() {
    return unwrapState(this.state)
  }
  get prevAppState() {
    return unwrapState(this.prevState)
  }
  bootstrap() {
    let renderCircuit = this.renderCircuit.bind(this)
    let registerRefHandler = this.registerRefHandler.bind(this)
    let { props, context } = this, child = props.children
    let { app, transport, services, cleanup } = isValidElement(child)
      ? { app: Children.only(child) }
      : child.call(null, renderCircuit, registerRefHandler, context)
    let childContext = Object.assign({ renderCircuit, services }, transport)
    return { app, transport, services, renderCircuit, childContext, cleanup }
  }
  renderCircuit(updater, publisher, args = [], cb) {
    if (publisher) this.publishers.push([publisher, args])
    return this.setState(wrapState.bind(null, updater, args), cb)
  }
  registerRefHandler(refHandler, ...args) {
    return ref => (this.refState = refHandler.call(null, ref, this.refState, ...args))
  }
  componentWillMount() {
    this.publishers = []
    Object.assign(this, this.bootstrap())
  }
  componentWillUnmount() {
    unsetProps(this, ['prevState', 'publishers'])
    if (this.cleanup) this.cleanup.call(null)
  }
  componentDidUpdate() {
    this.prevState = this.state
  }
  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState)
  }
  publish() {
    this.publishers.forEach(([fn, args]) => fn.call(null, this.appState, ...args))
    this.publishers = []
  }
  render() {
    let { appState, prevAppState } = this
    let render = isValidElement(this.app) ? cloneElement.bind(null, this.app) : this.app.bind(null)
    this.publish()
    return render({appState, prevAppState})
  }
  getChildContext() {
    return this.childContext
  }
}
Circuit.propTypes = { children: PropTypes.func.isRequired }
Circuit.childContextTypes = {
  renderCircuit: PropTypes.func,
  intake: PropTypes.object,
  outtake: PropTypes.object,
  services: PropTypes.object
}
Circuit.contextTypes = {
  intake: PropTypes.object,
  outtake: PropTypes.object,
  services: PropTypes.object
}
