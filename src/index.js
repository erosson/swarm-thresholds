import _ from 'lodash'

const reducers = {
  add(total, next) {return total + next},
  max: Math.max,
  min: Math.min,
  'decimal.add'(total, next) {return total.plus(next)},
  'decimal.max'(total, next) {return total.constructor.max(total, next)},
  'decimal.min'(total, next) {return total.constructor.min(total, next)},
}
export class StatValue {
  constructor(value, reducer) {
    this.value = value
    this.reducer = reducers[reducer] || reducer
    console.assert(_.isFunction(this.reducer), 'StatValue.reducer not a function')
  }
  update(value) {
    this.value = this.reducer(this.value, value)
  }
}
