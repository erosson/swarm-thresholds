import _ from 'lodash'
import ImmutableSchema from './ImmutableSchema'

export default class MutableSchema {
  constructor(ischema) {
    this._schema = ischema
    this.next = null
  }
  static create(statspecs) {
    return new MutableSchema(ImmutableSchema.create(statspecs))
  }
  // API similar to the immutable version, for the most part
  addStats(statspecs) {this._schema.addStats(statspecs)}
  threshold(thresh) {return this._schema.threshold(thresh)}
  thresholdList(threshes) {return this._schema.thresholdList(threshes)}
  thresholds(...threshes) {return this._schema.thresholdList(threshes)}
  isComplete(thresh, state) {return this._schema.isComplete(thresh, state)}
  percent(thresh, state) {return this._schema.percent(thresh, state)}
  // Unlike the immutable version, this schema tracks its own state. No need to
  // pass or return next.
  check(state, keys) {
    const {completed, next} = this._schema.check(this.next, state, keys)
    this.next = next
    // MutableSchema gets observers/subscribers/callbacks/whateveryouwannacallem.
    // Immutable stays side-effect-free, because immutable.
    for (let thresh of completed) {
      let onComplete = thresh.onComplete || []
      if (_.isFunction(onComplete)) {
        onComplete = [onComplete]
      }
      for (let fn of onComplete) {
        fn.call(thresh, thresh)
      }
    }
    return completed
  }
}
