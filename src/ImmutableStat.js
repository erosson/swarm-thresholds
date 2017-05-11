import _ from 'lodash'
import {Stack} from 'immutable'

const types = _.mapValues({
  max: {
    percent(total, quota) {return Math.min(1, Math.max(0, total / quota))},
    isComplete(total, quota) {return total >= quota},
    comparator(a, b) {return a - b},
  },
  min: {
    isComplete(total, quota) {return total <= quota},
    // percent-cmplete doesn't make sense for min
    percent(total, quota) {return null},
    comparator(a, b) {return b - a},
  },
  bool: {
    isComplete(total) {return !!total},
    percent(total) {return  null},
    comparator(a, b) {return (a?1:0) - (b?1:0)},
  },
  // Don't actually depend on decimal.js, to keep the library small for non-
  // decimal consumers. Instead, use the decimal passed as a param.
  'decimal.max': {
    percent(total, quota) {return quota.constructor.min(1, quota.constructor.max(0, new quota.constructor(total).dividedBy(quota)))},
    isComplete(total, quota) {return new quota.constructor(total).gte(quota)},
    comparator(a, b, ctor=i=>i) {return ctor(a).cmp(b)},
  },
  'decimal.min': {
    isComplete(total, quota) {return new quota.constructor(total).lte(quota)},
    // percent-cmplete doesn't make sense for min
    percent(total, quota) {return null},
    comparator(a, b, ctor=i=>i) {return ctor(b).cmp(a)},
  },
}, (obj, name) => Object.assign(obj, {name}))

export class Threshold {
  constructor(stat, thresh) {
    this.stat = stat
    this.thresh = thresh
  }
  percent(state) {
    return this.stat.percent(this.thresh, state)
  }
  isComplete(state) {
    return this.stat.isComplete(this.thresh, state)
  }
}

export default class ImmutableStat {
  constructor(selector, type, thresholds) {
    this._selector = _.isFunction(selector) ? selector : s => _.get(s, selector)
    this._type = types[type] || type || types.max
    this._thresholds = thresholds || new Stack()
  }
  // add thresholds. These are mutable, despite the class name. Threshold-setup
  // is simpler than threshold-checking, only happens once, at startup, and is
  // more convenient with mutability.
  thresholdList(threshes) {
    console.assert(this._type.name === 'bool' || !_.some(threshes, thresh => thresh.quota === undefined), 'threshold must have a quota')
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
  // Check a specific threshold's status.
  isComplete(thresh, state) {
    return this._type.isComplete(this.value(state), thresh.quota)
  }
  percent(thresh, state) {
    return this._type.percent(this.value(state), thresh.quota)
  }
  // check threshold status.
  // The pattern: `const thresholds = stat.check(state); stat = stat.pop(thresholds);``
  value(state) {
    return this._selector(state)
  }
  check(next0, state) {
    next0 = next0 || 0
    const val = this.value(state)
    const complete = this._thresholds.skip(next0).takeWhile(({quota}) => this._type.isComplete(val, quota)).toArray()
    const next = next0 + complete.length
    return {complete, next}
  }
  //bind(next) {
  //  return state => this.check(next, state)
  //}
}
