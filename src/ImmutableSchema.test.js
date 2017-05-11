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
    const [ten,twoten] = schema.thresholds({
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

    expect(ten.progress({my:{foo:4, bar: 6}})).toEqual({
      stats: {
        'foo': {quota: 10, value: 4, percent: 0.4, isComplete: false, type: 'max'},
        'bar': {quota: Decimal(10), value: 6, percent: 0.6, isComplete: false, type: 'decimal.max'},
      },
      quota: 2, value: 0, percent: 0, isComplete: false, type: 'schema',
    })
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
  it('supports thresholds as selectors used by other thresholds', () => {
    // the only "real" stat; that is, direct state reference
    const schema = ImmutableSchema.create({foo: {type: 'bool', selector: 'foo'}})
    // a threshold based on that stat
    const foo = schema.threshold({quotas: {foo: true}, name: 'foo.'})
    // a stat based on the first threshold!
    schema.addStats({bar: {type: 'bool', selector: state => foo.isComplete(state)}})
    // keep the cycle going a few times.
    const bar = schema.threshold({quotas: {bar: true}, name: 'bar.'})
    schema.addStats({baz: {type: 'bool', selector: state => bar.isComplete(state)}})
    const baz = schema.threshold({quotas: {bar: true}, name: 'baz.'})

    // changing the real-stat cascades down all thresholds exactly as you'd expect.
    expect(schema.check(null, {foo: false}).completed.map(t=>t.name)).toEqual([])
    expect(schema.check(null, {foo: true}).completed.map(t=>t.name)).toEqual(['foo.', 'bar.', 'baz.'])
    // The practical value here:
    // * achievements based on other achievements are all over diablo 3, for example
    // * earning an achievement can require that the achievement is visible, based on a separate visibility-threshold
    // * supporting recursive composition is just cool
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
