import ImmutableStat from './ImmutableStat'
import Decimal from 'decimal.js'

describe('ImmutableStat', () => {
  it('selects values with fn', () => {
    const stat = new ImmutableStat(state => state.foo)
    expect(stat.value({foo: 3})).toEqual(3)
    expect(stat.value({})).toEqual(undefined)
  })
  it('selects values with lodash.iteratee', () => {
    const stat = new ImmutableStat('foo.bar[0].baz')
    expect(stat.value({foo: {bar: [{baz: 3}]}})).toEqual(3)
    expect(stat.value({})).toEqual(undefined)
  })
  it('finds thresholds', () => {
    const stat = new ImmutableStat(i => i)
    stat.thresholds(
      {quota: 10, name: 'ten'},
      {quota: 20, name: 'twoten'},
      {quota: 5, name: 'halften'},
    )
    expect(stat.check(0).map(t=>t.name)).toEqual([])
    expect(stat.check(4.99).map(t=>t.name)).toEqual([])
    expect(stat.check(5).map(t=>t.name)).toEqual(['halften'])
    expect(stat.check(9.99).map(t=>t.name)).toEqual(['halften'])
    expect(stat.check(10).map(t=>t.name)).toEqual(['halften', 'ten'])
    expect(stat.check(25).map(t=>t.name)).toEqual(['halften', 'ten', 'twoten'])
    expect(stat.pop(stat.check(5)).check(5).map(t=>t.name)).toEqual([])
    expect(stat.pop(stat.check(5)).check(10).map(t=>t.name)).toEqual(['ten'])
  })
  it('finds min thresholds', () => {
    const stat = new ImmutableStat(i => i, 'min')
    stat.thresholds(
      {quota: 10, name: 'ten'},
      {quota: 20, name: 'twoten'},
      {quota: 5, name: 'halften'},
    )
    expect(stat.check(25).map(t=>t.name)).toEqual([])
    expect(stat.check(20.01).map(t=>t.name)).toEqual([])
    expect(stat.check(20).map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(19.99).map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(10.01).map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(10).map(t=>t.name)).toEqual(['twoten', 'ten'])
    expect(stat.check(9.99).map(t=>t.name)).toEqual(['twoten', 'ten'])
    expect(stat.check(5).map(t=>t.name)).toEqual(['twoten', 'ten', 'halften'])
    expect(stat.check(0).map(t=>t.name)).toEqual(['twoten', 'ten', 'halften'])
    expect(stat.pop(stat.check(20)).check(20).map(t=>t.name)).toEqual([])
    expect(stat.pop(stat.check(20)).check(10).map(t=>t.name)).toEqual(['ten'])
  })
  it('finds decimal.js thresholds', () => {
    const stat = new ImmutableStat(i => i, 'decimal.max')
    stat.thresholds(
      {quota: Decimal(10), name: 'ten'},
      {quota: Decimal(20), name: 'twoten'},
      {quota: Decimal(5), name: 'halften'},
    )
    expect(stat.check(0).map(t=>t.name)).toEqual([])
    expect(stat.check('0').map(t=>t.name)).toEqual([])
    expect(stat.check(Decimal(0)).map(t=>t.name)).toEqual([])
    expect(stat.check(4.99).map(t=>t.name)).toEqual([])
    expect(stat.check(5).map(t=>t.name)).toEqual(['halften'])
    expect(stat.check('5').map(t=>t.name)).toEqual(['halften'])
    expect(stat.check(Decimal(5)).map(t=>t.name)).toEqual(['halften'])
    expect(stat.check(9.99).map(t=>t.name)).toEqual(['halften'])
    expect(stat.check(10).map(t=>t.name)).toEqual(['halften', 'ten'])
    expect(stat.check(25).map(t=>t.name)).toEqual(['halften', 'ten', 'twoten'])
    expect(stat.pop(stat.check(5)).check(5).map(t=>t.name)).toEqual([])
    expect(stat.pop(stat.check(5)).check(10).map(t=>t.name)).toEqual(['ten'])
  })
  it('finds decimal.js min thresholds', () => {
    const stat = new ImmutableStat(i => i, 'decimal.min')
    stat.thresholds(
      {quota: Decimal(10), name: 'ten'},
      {quota: Decimal(20), name: 'twoten'},
      {quota: Decimal(5), name: 'halften'},
    )
    expect(stat.check(25).map(t=>t.name)).toEqual([])
    expect(stat.check(20.01).map(t=>t.name)).toEqual([])
    expect(stat.check(20).map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check('20').map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(Decimal(20)).map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(19.99).map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(10.01).map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(10).map(t=>t.name)).toEqual(['twoten', 'ten'])
    expect(stat.check(9.99).map(t=>t.name)).toEqual(['twoten', 'ten'])
    expect(stat.check(5).map(t=>t.name)).toEqual(['twoten', 'ten', 'halften'])
    expect(stat.check(0).map(t=>t.name)).toEqual(['twoten', 'ten', 'halften'])
    expect(stat.pop(stat.check(20)).check(20).map(t=>t.name)).toEqual([])
    expect(stat.pop(stat.check(20)).check(10).map(t=>t.name)).toEqual(['ten'])
  })
})
