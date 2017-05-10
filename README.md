# swarm-thresholds

[![Travis][build-badge]][build]
[![npm package][npm-badge]][npm]
[![Coveralls][coveralls-badge]][coveralls]

Watch for numbers to cross a specific value. Useful for building achievement or trigger systems for games.

[build-badge]: https://img.shields.io/travis/user/repo/master.png?style=flat-square
[build]: https://travis-ci.org/user/repo

[npm-badge]: https://img.shields.io/npm/v/npm-package.png?style=flat-square
[npm]: https://www.npmjs.org/package/npm-package

[coveralls-badge]: https://img.shields.io/coveralls/user/repo/master.png?style=flat-square
[coveralls]: https://coveralls.io/github/user/repo

## Quick start

Start by defining some **stats** you want to watch. Each stat has a selector (getter) function that reads the current value of this stat from your game state.

    var stat = new ImmutableStat(function(game) {return game.drones.bought});
    stat.value({drones: {bought: 1000}})
    // => 1000

For simple selectors, [Lodash.get()](https://lodash.com/docs/)-style paths will work.

    var stat2 = new ImmutableStat('drones.spent');
    stat2.value({drones: {spent: 2000}})
    // => 1000

Combine multiple stats into a **schema**.

    var schema = new MutableSchema({
      dronesBought: new ImmutableStat('drones.bought'),
      dronesSpent: new ImmutableStat('drones.spent'),
    })

Define **thresholds** - the values at which the achievement is earned, the trigger is fired, or some other event happens.

    var achievement = schema.threshold({
      name: 'aGoodStart',
      quotas: {
        dronesBought: 5,
      }
    })
    achievement.percent({drones: {bought: 3}})
    // => 0.6
    achievement.isComplete({drones: {bought: 3}})
    // => false
    achievement.percent({drones: {bought: 5}})
    // => 1
    achievement.isComplete({drones: {bought: 5}})
    // => true

Occasionally, check for threshold completion. (`setInterval` works to get started, but there's usually a better time to call `schema.check()`. Maybe right after your user clicks?)

    setInterval(function() {
      var completed = schema.check(game);
      for (var i=0; i < completed.length; i++) {
        game.markAchievementCompleted(completed[i].name);
      }
    }, 5000)
    game.mainLoop();

Set `threshold.onComplete` to call a function when the threshold is met:

    var achievement2 = schema.threshold({
      name: 'supplyLimitExceeded',
      onComplete: function() {
        game.markAchievementCompleted(this.name),
      },
      quotas: {
        dronesBought: 201,
      },
    })
    setInterval(function() {schema.check(game)}, 5000);
    game.mainLoop();

## More features

[Decimal.js](https://github.com/MikeMcl/decimal.js/) is supported.

    var stat3 = new ImmutableStat('big', 'decimal.max');
    stat3.value({big: Decimal(4000)})
    // => Decimal(4000)

Normally, stats should only increase. For values that can change in either direction, watch the maximum value instead - for example, 'highestMoneyEver' instead of 'currentMoney'.

Statistics that only *decrease* also work. This is useful for tracking time, and achievements based around speedrunning/fastest-times.

    var stat4 = new ImmutableStat('fastestPrestigeMillis', 'min');
    stat4.value({fastestPrestigeMillis: 80000})
    // => 80000

Schemas also allow thresholds for multiple stats. These multi-stat thresholds are only completed when *all* the related stats are met.

    var schema = new MutableSchema({
      dronesBought: new ImmutableStat('drones.bought'),
      millisSinceLastPrestige: new ImmutableStat(function(game) {
        return Date.now() - game.lastPrestigedAt;
      }),
    })
    var achievement2 = schema.threshold({
      name: 'build1000DronesIn5Minutes',
      quotas: {
        dronesBought: 1000,
        millisSinceLastPrestige: 5 * 60 * 1000,
      },
    })

Often, achievements are earned when a certain event is triggered. You can make that event add to your game state:

    function onKonamiCodeEntered() {
      game.konamiCodeEntered = 1
    }
    schema.threshold({
      quotas: {konamiCodeEntered: 1},
    })

Immutable schemas are supported. The `check()` API is more awkward than the mutable version, but immutability is useful if you're using a data store like [Redux](https://redux.js.org).

    var schema = new ImmutableSchema({
      dronesBought: new ImmutableStat('drones.bought'),
    })
    // ...
    var next = null
    setInterval(function() {
      var checked = schema.check(next, game)
      next = checked.next;
      for (var i=0; i < checked.completed.length; i++) {
        game.markAchievementCompleted(checked.completed[i].name);
      }
    }, 5000);
    game.mainLoop();

## Installation

    <script src="//cdn.rawgit.com/erosson/swarm-thresholds/v0.0.1/dist/swarm-thresholds.min.js"></script>

or

    bower install --save swarm-thresholds

or

    npm install --save swarm-thresholds

    const thresholds = require('swarm-thresholds')

## License

MIT - use this anywhere. I'd like it if you open-sourced any changes you make to this library (send a pull request? Github fork?), but it's not required.
