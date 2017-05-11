import ImmutableStat from './ImmutableStat'
import ImmutableSchema from './ImmutableSchema'
import Decimal from 'decimal.js'

describe('ImmutableSchema', () => {
  it('checks schema-thresholds for multiple stats', () => {
    const schema = ImmutableSchema.create({
      foo: {selector: 'my.foo'},
      bar: {selector: 'my.bar', type: 'decimal.max'},
      baz: {selector: 'my.baz', type: 'min'},
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
  it('supports partial-match thresholds (ex. collect 2 of 3)', () => {
    const schema = ImmutableSchema.create({
      foo: {selector: 'foo', type: 'bool'},
      bar: {selector: 'bar', type: 'bool'},
      baz: {selector: 'baz', type: 'bool'},
    })
    schema.thresholds({
      quotas: {
        foo: true,
        bar: true,
        baz: true,
      },
      quota: 2,
      name: '2/3',
    })
    expect(schema.check(null, {foo: true, bar: true, baz: true}).completed.map(t=>t.name)).toEqual(['2/3'])
    expect(schema.check(null, {foo: true, bar: true, baz: false}).completed.map(t=>t.name)).toEqual(['2/3'])
    expect(schema.check(null, {foo: true, bar: false, baz: false}).completed.map(t=>t.name)).toEqual([])
  })
  it('avoids circular references', () => {
    const schema = ImmutableSchema.create({
      foo: {selector: 'my.foo'},
      bar: {selector: 'my.bar', type: 'decimal.max'},
      baz: {selector: 'my.baz', type: 'min'},
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
