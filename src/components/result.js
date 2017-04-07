import { Component, PropTypes } from 'react'
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
    return this.props.children.call(this, this.result)
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
  renderApp: PropTypes.func,
  intake: PropTypes.object,
  outtake: PropTypes.object,
  services: PropTypes.object
}
