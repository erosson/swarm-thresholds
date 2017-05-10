import _ from 'lodash'
import {Stack} from 'immutable'

export class Threshold {
  constructor(stat, {quota, params}) {
    this.stat = stat
    this.quota = quota
    this.params = params
  }
}

const types = {
  max: {
    percent(total, quota) {return total / quota},
    isComplete(total, quota) {return total >= quota},
    comparator(a, b) {return a - b},
  },
  min: {
    isComplete(total, quota) {return total <= quota},
    // percent-cmplete doesn't make sense for min
    percent(total, quota) {return null},
    comparator(a, b) {return b - a},
  },
  // Don't actually depend on decimal.js, to keep the library small for non-
  // decimal consumers. Instead, use the decimal passed as a param.
  'decimal.max': {
    percent(total, quota) {return total.dividedBy(quota)},
    isComplete(total, quota) {return total.gte(quota)},
    comparator(a, b, ctor=i=>i) {return ctor(a).cmp(b)},
  },
  'decimal.min': {
    isComplete(total, quota) {return total.lte(quota)},
    // percent-cmplete doesn't make sense for min
    percent(total, quota) {return null},
    comparator(a, b, ctor=i=>i) {return ctor(b).cmp(a)},
  },
}

export default class ImmutableStat {
  constructor(selector, type, thresholds) {
    this._selector = _.iteratee(selector)
    this._type = types[type] || type || types.max
    this._thresholds = thresholds || new Stack()
  }
  // add thresholds. These are mutable, despite the class name. Threshold-setup
  // is simpler than threshold-checking, only happens once, at startup, and is
  // more convenient with mutability.
  thresholdList(threshes) {
    console.assert(!_.some(threshes, thresh => thresh.quota === undefined), 'threshold must have a quota')
    // A priority queue/heap would be the ideal data structure here, but
    // immutble.js doesn't have those. Sorting after every threshold push is
    // slower than necessary, but not enough to write my own pqueue - thresholds
    // are only added once and never get into the thousands/etc. anyway, and
    // profiling hasn't suggested this is a problem yet.
    this._thresholds = this._thresholds.concat(threshes).sortBy(_.iteratee('quota'), this._type.comparator)
    return threshes.map(thresh => new Threshold(this, thresh))
  }
  threshold(thresh) {
    return this.thresholdList([thresh])[0]
  }
  thresholds(...threshes) {
    return this.thresholdList(threshes)
  }
  // check threshold status.
  // The pattern: `const thresholds = stat.check(state); stat = stat.pop(thresholds);``
  value(state) {
    return this._selector(state)
  }
  check(state) {
    const val = this.value(state)
    return this._thresholds.takeWhile(({quota}) => this._type.comparator(val, quota, quota.constructor) >= 0).toArray()
  }
  pop(checked) {
    return new ImmutableStat(this._selector, this._type, this._thresholds.skip(checked.length))
  }
}
