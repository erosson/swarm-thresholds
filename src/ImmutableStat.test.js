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
  it('checks thresholds', () => {
    const stat = new ImmutableStat(i => i)
    stat.thresholds(
      {quota: 10, name: 'ten'},
      {quota: 20, name: 'twoten'},
      {quota: 5, name: 'halften'},
    )
    expect(stat.check(null, 0).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, 4.99).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, 5).complete.map(t=>t.name)).toEqual(['halften'])
    expect(stat.check(null, 9.99).complete.map(t=>t.name)).toEqual(['halften'])
    expect(stat.check(null, 10).complete.map(t=>t.name)).toEqual(['halften', 'ten'])
    expect(stat.check(null, 25).complete.map(t=>t.name)).toEqual(['halften', 'ten', 'twoten'])
    expect(stat.check(stat.check(null, 5).next, 5).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(stat.check(null, 5).next, 10).complete.map(t=>t.name)).toEqual(['ten'])
  })
  it('checks min thresholds', () => {
    const stat = new ImmutableStat(i => i, 'min')
    stat.thresholds(
      {quota: 10, name: 'ten'},
      {quota: 20, name: 'twoten'},
      {quota: 5, name: 'halften'},
    )
    expect(stat.check(null, 25).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, 20.01).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, 20).complete.map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(null, 19.99).complete.map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(null, 10.01).complete.map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(null, 10).complete.map(t=>t.name)).toEqual(['twoten', 'ten'])
    expect(stat.check(null, 9.99).complete.map(t=>t.name)).toEqual(['twoten', 'ten'])
    expect(stat.check(null, 5).complete.map(t=>t.name)).toEqual(['twoten', 'ten', 'halften'])
    expect(stat.check(null, 0).complete.map(t=>t.name)).toEqual(['twoten', 'ten', 'halften'])
    expect(stat.check(stat.check(null, 20).next, 20).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(stat.check(null, 20).next, 10).complete.map(t=>t.name)).toEqual(['ten'])
  })
  it('checks bool thresholds', () => {
    const stat = new ImmutableStat(i => i, 'bool')
    stat.thresholds(
      {name: 'thebool'},
    )
    expect(stat.check(null, false).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, true).complete.map(t=>t.name)).toEqual(['thebool'])
    expect(stat.check(stat.check(null, true).next, true).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(stat.check(null, false).next, true).complete.map(t=>t.name)).toEqual(['thebool'])
    // truthy/falsy works; not strict bools
    expect(stat.check(null, 0).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, 1).complete.map(t=>t.name)).toEqual(['thebool'])
    expect(stat.check(null, null).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, undefined).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, "hi").complete.map(t=>t.name)).toEqual(['thebool'])
  })
  it('checks decimal.js thresholds', () => {
    const stat = new ImmutableStat(i => i, 'decimal.max')
    stat.thresholds(
      {quota: Decimal(10), name: 'ten'},
      {quota: Decimal(20), name: 'twoten'},
      {quota: Decimal(5), name: 'halften'},
    )
    expect(stat.check(null, 0).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, '0').complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, Decimal(0)).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, 4.99).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, 5).complete.map(t=>t.name)).toEqual(['halften'])
    expect(stat.check(null, '5').complete.map(t=>t.name)).toEqual(['halften'])
    expect(stat.check(null, Decimal(5)).complete.map(t=>t.name)).toEqual(['halften'])
    expect(stat.check(null, 9.99).complete.map(t=>t.name)).toEqual(['halften'])
    expect(stat.check(null, 10).complete.map(t=>t.name)).toEqual(['halften', 'ten'])
    expect(stat.check(null, 25).complete.map(t=>t.name)).toEqual(['halften', 'ten', 'twoten'])
    expect(stat.check(stat.check(null, 5).next, 5).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(stat.check(null, 5).next, 10).complete.map(t=>t.name)).toEqual(['ten'])
  })
  it('checks decimal.js min thresholds', () => {
    const stat = new ImmutableStat(i => i, 'decimal.min')
    stat.thresholds(
      {quota: Decimal(10), name: 'ten'},
      {quota: Decimal(20), name: 'twoten'},
      {quota: Decimal(5), name: 'halften'},
    )
    expect(stat.check(null, 25).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, 20.01).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(null, 20).complete.map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(null, '20').complete.map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(null, Decimal(20)).complete.map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(null, 19.99).complete.map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(null, 10.01).complete.map(t=>t.name)).toEqual(['twoten'])
    expect(stat.check(null, 10).complete.map(t=>t.name)).toEqual(['twoten', 'ten'])
    expect(stat.check(null, 9.99).complete.map(t=>t.name)).toEqual(['twoten', 'ten'])
    expect(stat.check(null, 5).complete.map(t=>t.name)).toEqual(['twoten', 'ten', 'halften'])
    expect(stat.check(null, 0).complete.map(t=>t.name)).toEqual(['twoten', 'ten', 'halften'])
    expect(stat.check(stat.check(null, 20).next, 20).complete.map(t=>t.name)).toEqual([])
    expect(stat.check(stat.check(null, 20).next, 10).complete.map(t=>t.name)).toEqual(['ten'])
  })
  it('returns threshold objects', () => {
    const stat = new ImmutableStat(i => i)
    const thresh = stat.threshold({quota: 10, name: 'ten'})
    expect(thresh.isComplete(0)).toEqual(false)
    expect(thresh.isComplete(9.99)).toEqual(false)
    expect(thresh.isComplete(10)).toEqual(true)
    expect(thresh.isComplete(11)).toEqual(true)
    expect(thresh.percent(0)).toEqual(0)
    expect(thresh.percent(5)).toEqual(0.5)
    expect(thresh.percent(10)).toEqual(1)
    expect(thresh.percent(15)).toEqual(1)
    expect(thresh.percent(-5)).toEqual(0)
  })
  it('avoids circular references', () => {
    const stat = new ImmutableStat(i => i)
    stat.threshold({quota: 10, name: 'ten'})
    expect(() => JSON.stringify(stat)).not.toThrow()
  })
})
