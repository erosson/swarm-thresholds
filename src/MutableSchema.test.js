import MutableSchema from './MutableSchema'
import ImmutableStat from './ImmutableStat'
import Decimal from 'decimal.js'

describe('MutableSchema', () => {
  it('works', () => {
    const schema = new MutableSchema({
      foo: new ImmutableStat('my.foo'),
      bar: new ImmutableStat('my.bar', 'decimal.max'),
      baz: new ImmutableStat('my.baz', 'min'),
    })
    let done = null
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
      onComplete() {done = this.name},
      name: 'twoten',
    })
    expect(schema.check({my:{foo:5, bar: 5}}).map(t=>t.name)).toEqual([])
    expect(schema.check({my:{foo:10, bar: 5}}).map(t=>t.name)).toEqual([])
    // Below is actually invalid - we assume max() values won't ever decrease
    // Maybe mutable should track them?
    //expect(schema.check({my:{foo:5, bar: 10}}).map(t=>t.name)).toEqual([])
    // Mutable means a check() only works once. Not idempotent.
    expect(schema.check({my:{foo:10, bar: 10}}).map(t=>t.name)).toEqual(['ten'])
    expect(schema.check({my:{foo:10, bar: 10}}).map(t=>t.name)).toEqual([])
    expect(schema.check({my:{foo:10, bar: 10}}).map(t=>t.name)).toEqual([])
    // onComplete callback (only for mutables; immutables stay pure!)
    expect(done).toEqual(null)
    expect(schema.check({my:{foo:20, bar: 10}}).map(t=>t.name)).toEqual([])
    expect(done).toEqual(null)
    expect(schema.check({my:{foo:20, bar: 20}}).map(t=>t.name)).toEqual(['twoten'])
    expect(done).toEqual('twoten')
  })
})
