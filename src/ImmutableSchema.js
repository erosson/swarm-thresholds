import _ from 'lodash'

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
  // Setup thresholds.
  threshold(thresh) {
    return new SchemaThreshold(_.mapValues(thresh.quotas, (quota, key) =>
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
    return !_.some(_.map(thresh.quotas, (quota, key) => !this._stats[key].isComplete({quota}, state)))
  }
  percent(thresh, state) {
    return _.mapValues(thresh.quotas, (quota, key) => this._stats[key].percent({quota}, state))
  }
  // Check for any completed thresholds in this state.
  check(state, keys=Object.keys(this._stats)) {
    // Results of individual stat checks. We get a schemaThresh here if *any* of its stat-thresholds are met...
    const stats = _(keys).keyBy().mapValues(key => this._stats[key].check(state)).value()
    // ...but we only return the result if *all* of the schema-threshold's stat-thresholds are met.
    const completed = _.uniq(_.filter(_.flatMap(stats, checks => _.map(checks, ({schemaThresh}) => {
      return schemaThresh && this.isComplete(schemaThresh, state) ? schemaThresh : null
    }))))
    return {completed, stats}
  }
  pop({completed, stats:checkeds}) {
    return new ImmutableSchema(Object.assign({}, this._stats, _.mapValues(checkeds, (checked, key) => {
      return this._stats[key].pop(checked)
    })))
  }
}
