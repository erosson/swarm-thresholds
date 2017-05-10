import _ from 'lodash'

const types = {
  add: {
    init: 0,
    reducer(total, next) {return total + next},
    percent(total, quota) {return total / quota},
    isComplete(total, quota) {return this.percent(total, quota) >= 1},
  },
  max: {
    init: Number.NEGATIVE_INFINITY,
    reducer: Math.max,
    percent(total, quota) {return total / quota},
    isComplete(total, quota) {return this.percent(total, quota) >= 1},
  },
  min: {
    init: Number.POSITIVE_INFINITY,
    reducer: Math.min,
    isComplete(total, quota) {return total <= quota},
    // percent-cmplete doesn't make sense for min
    percent(total, quota) {return null},
  },
  // Don't actually depend on decimal.js, to keep the library small for non-
  // decimal consumers. Instead, use the decimal passed as a param.
  'decimal.add': {
    reducer(total, next) {return total.plus(next)},
    percent(total, quota) {return total.dividedBy(quota)},
    isComplete(total, quota) {return this.percent(total, quota).gte(1)},
    comparator(quota) {return (a, b) => quota.constructor(a).cmp(b)},
  },
  'decimal.max': {
    reducer(total, next) {return total.constructor.max(total, next)},
    percent(total, quota) {return total.dividedBy(quota)},
    isComplete(total, quota) {return total.gte(quota)},
    comparator(quota) {return (a, b) => quota.constructor(a).cmp(b)},
  },
  'decimal.min': {
    reducer(total, next) {return total.constructor.min(total, next)},
    isComplete(total, quota) {return total.lte(quota)},
    // percent-cmplete doesn't make sense for min
    percent(total, quota) {return null},
    comparator(quota) {return (a, b) => quota.constructor(a).cmp(b)},
  },
}

export class StatValue {
  constructor(value, type) {
    this.value = value
    this.type = types[type] || type
    this.thresholds = []
    if (!this.type) throw new Error('not a stat-type: '+type)
  }
  threshold(quota) {
    const ret = new Threshold(this, quota)
    this.thresholds.push(ret)
    this.thresholds.sort(this.type.comparator && this.type.comparator(quota))
    return ret
  }
  update(value) {
    this.value = this.type.reducer(this.value, value)
  }
}

class Threshold {
  constructor(stat, quota) {
    this.stat = stat
    this.quota = quota
    this.subs = []
  }
  percent() { return this.stat.percent(this.stat.value, this.quota) },
  isComplete() { return this.stat.isComplete(this.stat.value, this.quota) },
  onComplete(fn) { this.subs.push(fn) },
}
