import _ from 'lodash'
import ImmutableStat from './ImmutableStat'

class SchemaThreshold {
  constructor(schema, thresh) {
    this.schema = schema
    this.thresh = thresh
  }
  isComplete(state) {
    return this.schema.isComplete(this.thresh, state)
  }
  progress(state) {
    return this.schema.progress(this.thresh, state)
  }
}

// Thresholds for groups of ImmutableStats.
export default class ImmutableSchema {
  constructor(stats) {
    this._stats = stats
  }
  static create(statspecs) {
    return new ImmutableSchema(_.mapValues(statspecs, (statspec, key) => {
      return new ImmutableStat(statspec.selector, statspec.type)
    }))
  }
  // Setup thresholds.
  threshold(thresh) {
    // default meta-quota: all of them
    thresh = Object.assign({quota: Object.keys(thresh.quotas).length}, thresh)
    return new SchemaThreshold(this, _.mapValues(thresh.quotas, (quota, key) =>
      this._stats[key].threshold({quota, schemaThresh: thresh})))
  }
  thresholdList(threshes) {
    return threshes.map(thresh => this.threshold(thresh))
  }
  thresholds(...threshes) {
    return this.thresholdList(threshes)
  }
  // Check on specific thresholds.
  isComplete(thresh, state) {
    const completed = _(thresh.quotas)
    .map((quota, key) => this._stats[key].isComplete({quota}, state))
    .filter()
    .value()
    return completed.length >= thresh.quota
  }
  percent(thresh, state) {
    return _.mapValues(thresh.quotas, (quota, key) => this._stats[key].percent({quota}, state))
  }
  // Check for any completed thresholds in this state.
  check(next0, state, keys=Object.keys(this._stats)) {
    // Results of individual stat checks. We get a schemaThresh here if *any* of its stat-thresholds are met...
    const rets = _(keys).keyBy().mapValues(key => {
      const statnext = _.get(next0, key, null)
      return this._stats[key].check(statnext, state)
    }).value()
    // ...and always return the next-state from the individual stat-checks...
    const next = _.mapValues(rets, 'next')
    // ...but only return the completed schema-threshold if *all* of that schema-threshold's stat-thresholds are met.
    const statCompleted = _.flatMap(rets, 'complete')
    const completed = _.uniq(_.filter(_.map(statCompleted, ({schemaThresh}) => {
      return schemaThresh && this.isComplete(schemaThresh, state) ? schemaThresh : null
    })))
    return {completed, next}
  }
}
