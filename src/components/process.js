import { Component } from 'react'
import PropTypes from 'prop-types'
import { has } from '../utils'
import { checkSubd } from './shared'
import { makeRefs, subscriber, unsubscriber } from './process-impl'

export default class Process extends Component {
  constructor(props) {
    super(props)
    if (!has('handlers')(props)) checkSubd(Process, this)
  }
  unsubscribe(keys) {
    return unsubscriber(this.__handles, keys)
  }
  componentWillMount() {
    return !this.__handles && (this.__handles = subscriber(makeRefs(this)))
  }
  shouldComponentUpdate() {
    return false
  }
  render() {
    return null
  }
}

Process.propTypes = {
  renderCircuit: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  intake: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  handlers: PropTypes.object
}
Process.contextTypes = {
  renderCircuit: PropTypes.func,
  intake: PropTypes.object,
  outtake: PropTypes.object,
  services: PropTypes.object
}
