import { Component, PropTypes } from 'react'
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
    let { props, context } = this
    let { app, transport, services } = props.children.call(
      null,
      renderCircuit,
      registerRefHandler,
      context
    )
    let childContext = Object.assign({ renderCircuit, services }, transport)
    return { app, transport, services, renderCircuit, childContext }
  }
  renderCircuit(updater, publisher, args = [], cb) {
    if (publisher) this.publishers.push([publisher, args])
    return this.setState(wrapState.bind(null, updater, args), cb)
  }
  registerRefHandler(refHandler, ...args) {
    return ref =>
      this.refState = refHandler.call(null, ref, this.refState, ...args)
  }
  componentWillMount() {
    this.publishers = []
    Object.assign(this, this.bootstrap())
  }
  componentWillUnmount() {
    unsetProps(this, ['prevState', 'publishers'])
  }
  componentDidUpdate() {
    this.prevState = this.state
  }
  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState)
  }
  publish() {
    this.publishers.forEach(([fn, args]) =>
      fn.call(null, this.appState, ...args)
    )
    this.publishers = []
  }
  render() {
    let { appState, prevAppState } = this
    this.publish()
    return this.app.call(null, appState, prevAppState)
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
