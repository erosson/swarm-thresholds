import ImmutableStat from './ImmutableStat'
import ImmutableSchema from './ImmutableSchema'
import Decimal from 'decimal.js'

describe('ImmutableSchema', () => {
  it('checks schema-thresholds for multiple stats', () => {
    const schema = new ImmutableSchema({
      foo: new ImmutableStat('my.foo'),
      bar: new ImmutableStat('my.bar', 'decimal.max'),
      baz: new ImmutableStat('my.baz', 'min'),
    })
    schema.thresholds({
      quotas: {
        foo: 10,
        bar: Decimal(10),
      },
      name: 'ten',
    }, {
      quotas: {
        foo: 20,
        bar: Decimal(20),
      },
      name: 'twoten',
    })
    expect(schema.check(null, {my:{foo:5, bar: 5}}).completed.map(t=>t.name)).toEqual([])
    expect(schema.check(null, {my:{foo:10, bar: 5}}).completed.map(t=>t.name)).toEqual([])
    expect(schema.check(null, {my:{foo:5, bar: 10}}).completed.map(t=>t.name)).toEqual([])
    expect(schema.check(null, {my:{foo:10, bar: 10}}).completed.map(t=>t.name)).toEqual(['ten'])
    // Caller can restrict the stats that are checked, for efficiency.
    // (Swarmsim example: no need to check hive-queen achievements when buying a drone.)
    expect(schema.check(null, {my:{foo:10, bar: 10}}, ['foo']).completed.map(t=>t.name)).toEqual(['ten'])
    expect(schema.check(null, {my:{foo:10, bar: 10}}, ['bar']).completed.map(t=>t.name)).toEqual(['ten'])
    expect(schema.check(null, {my:{foo:10, bar: 5}}, ['foo']).completed.map(t=>t.name)).toEqual([])
    // check()'s first arg is similar to the ImmutableStat version.
    expect(schema.check(schema.check(null, {my:{foo:10, bar: 10}}).next, {my:{foo:10, bar: 10}}).completed.map(t=>t.name)).toEqual([])
    expect(schema.check(schema.check(null, {my:{foo:10, bar: 5}}).next, {my:{foo:10, bar: 10}}).completed.map(t=>t.name)).toEqual(['ten'])
    expect(schema.check(schema.check(null, {my:{foo:10, bar: 10}}).next, {my:{foo:20, bar: 10}}).completed.map(t=>t.name)).toEqual([])
    expect(schema.check(schema.check(null, {my:{foo:10, bar: 10}}).next, {my:{foo:20, bar: 20}}).completed.map(t=>t.name)).toEqual(['twoten'])
    expect(schema.check(schema.check(null, {my:{foo:10, bar: 5}}).next, {my:{foo:20, bar: 20}}).completed.map(t=>t.name)).toEqual(['twoten', 'ten'])
  })
  it('avoids circular references', () => {
    const schema = new ImmutableSchema({
      foo: new ImmutableStat('my.foo'),
      bar: new ImmutableStat('my.bar', 'decimal.max'),
      baz: new ImmutableStat('my.baz', 'min'),
    })
    schema.thresholds({
      quotas: {
        foo: 10,
        bar: Decimal(10),
      },
      name: 'ten',
    })
    expect(() => JSON.stringify(schema)).not.toThrow()
  })
})
