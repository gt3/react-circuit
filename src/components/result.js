import { Component } from 'react'
import PropTypes from 'prop-types'
import { makeRefs, subscriber, closeHandles } from './result-impl'
import { wrapState, unwrapState, shallowCompare } from './shared'

export default class Result extends Component {
  constructor(props) {
    super(props)
    this.setResult = this.setResult.bind(this)
  }
  get result() {
    return unwrapState(this.state)
  }
  setResult(updater, args = [undefined, this.props, this.context], cb) {
    this.initialized = true
    return this.setState(wrapState.bind(null, updater, args, cb))
  }
  componentWillMount() {
    if (this.props.initialResult) this.setResult(this.props.initialResult)
    return !this.__handles && (this.__handles = subscriber(makeRefs(this)))
  }
  componentWillUnmount() {
    return closeHandles(this.__handles)
  }
  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState)
  }
  render() {
    let { initialized, result, props, context } = this
    return initialized ? props.children(result, props, context) : null
  }
}
Result.propTypes = {
  children: PropTypes.func.isRequired,
  handlers: PropTypes.object,
  subscribe: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  initialResult: PropTypes.any
}
Result.defaultProps = { children: () => null }
Result.contextTypes = {
  renderCircuit: PropTypes.func,
  intake: PropTypes.object,
  outtake: PropTypes.object,
  services: PropTypes.object
}
