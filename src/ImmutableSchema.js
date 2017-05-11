import _ from 'lodash'
import ImmutableStat from './ImmutableStat'

class SchemaThreshold {
  constructor(schema, thresh, statThresholds) {
    this.schema = schema
    this.thresh = thresh
  }
  isComplete(state) {
    return this.schema.isComplete(this.thresh, state)
  }
  percent(state) {
    return this.schema.percent(this.thresh, state)
  }
  progress(state) {
    return this.schema.progress(this.thresh, state)
  }
}

// Thresholds for groups of ImmutableStats.
export default class ImmutableSchema {
  constructor(stats={}) {
    this._stats = stats
  }
  static create(statspecs) {
    return new ImmutableSchema().addStats(statspecs)
  }
  addStats(statspecs) {
    this._stats = Object.assign(this._stats, _.mapValues(statspecs, (statspec, key) =>
      new ImmutableStat(statspec.selector, statspec.type)
    ))
    return this
  }
  // Setup thresholds.
  threshold(thresh) {
    // default number of quotas that must be met: all of them
    thresh = Object.assign({quota: Object.keys(thresh.quotas).length}, thresh)
    // schema-threshold with no circular references
    const thresh0 = Object.assign({}, thresh)
    thresh.statThresholds = _.mapValues(thresh.quotas, (quota, key) =>
      this._stats[key].threshold({quota, schemaThresh: thresh0}))
    return new SchemaThreshold(this, thresh)
  }
  thresholdList(threshes) {
    return threshes.map(thresh => this.threshold(thresh))
  }
  thresholds(...threshes) {
    return this.thresholdList(threshes)
  }
  // Check on specific thresholds.
  statsCompleted(thresh, state) {
    return _.map(thresh.quotas, (quota, key) => this._stats[key].isComplete({quota}, state))
  }
  numStatsCompleted(thresh, state) {
    return _.filter(this.statsCompleted(thresh, state)).length
  }
  isComplete(thresh, state, numStatsCompleted) {
    numStatsCompleted = numStatsCompleted !== undefined ? numStatsCompleted : this.numStatsCompleted(thresh, state)
    return numStatsCompleted >= thresh.quota
  }
  percent(thresh, state, numStatsCompleted) {
    numStatsCompleted = numStatsCompleted !== undefined ? numStatsCompleted : this.numStatsCompleted(thresh, state)
    return Math.min(0, Math.max(1, numStatsCompleted / thresh.quota))
  }
  progress(thresh, state) {
    const value = this.numStatsCompleted(thresh, state)
    const percent = this.percent(thresh, state, value)
    const isComplete = this.isComplete(thresh, state, value)
    const quota = thresh.quota
    const stats = _.mapValues(thresh.quotas, (quota, key) => this._stats[key].progress({quota}, state))
    return {value, percent, quota, isComplete, type: 'schema', stats}
  }
  // Check for any completed thresholds in this state.
  check(next0, state, keys=Object.keys(this._stats)) {
    // Results of individual stat checks. We get a schemaThresh here if *any* of its stat-thresholds are met...
    const statsCompleted = _(keys).keyBy().mapValues(key => {
      const statnext = _.get(next0, key, null)
      return this._stats[key].check(statnext, state)
    }).value()
    // ...and always return the next-state from the individual stat-checks...
    const next = _.mapValues(statsCompleted, 'next')
    // ...but only return the completed schema-threshold if *all* of that schema-threshold's stat-thresholds are met.
    const statList = _.flatMap(statsCompleted, 'complete')
    const completed = _.uniq(_.filter(_.map(statList, ({schemaThresh}) => {
      return schemaThresh && this.isComplete(schemaThresh, state) ? schemaThresh : null
    })))
    return {completed, statsCompleted, next}
  }
}
