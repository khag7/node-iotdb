/*
 *  test_convert.js
 *
 *  David Janes
 *  IOTDB
 *  2016-01-01
 *  "The Frickin Future"
 */

"use strict";

var assert = require("assert")
var sleep = require("sleep");
var _ = require("../helpers")

describe('test_convert', function() {
    describe('add', function() {
        it('default', function() {
            _.convert.add({
                from: 'iot-unit:test.something.100',
                to: 'iot-unit:test.something.10',
                convert: function(paramd) {
                    return Math.floor(paramd.value / 10);
                }
            });

            {
                var value = {
                    from: 'iot-unit:test.something.100',
                    to: 'iot-unit:test.something.10',
                    value: 1000,
                };
                var result = _.convert.convert(value);
                var expect = 100;

                assert.strictEqual(result, expect);
            }

            _.convert.add({
                from: 'iot-unit:test.something.10',
                to: 'iot-unit:test.something.5',
                convert: function(paramd) {
                    return Math.floor(paramd.value / 5);
                }
            });

            {
                var value = {
                    from: 'iot-unit:test.something.100',
                    to: 'iot-unit:test.something.5',
                    value: 1000,
                };
                var result = _.convert.convert(value);
                var expect = 20;

                assert.strictEqual(result, expect);
            }
        });
    });
    describe('convert', function() {
        describe('simple', function() {
            describe('c->f', function() {
                it('default', function() {
                    var value = {
                        from: 'iot-unit:temperature.si.celsius',
                        to: 'iot-unit:temperature.imperial.fahrenheit',
                        value: 0,
                    };
                    var result = _.convert.convert(value);
                    var expect = 32;

                    assert.strictEqual(result, expect);
                });
            });
            describe('f->c', function() {
                it('default', function() {
                    var value = {
                        from: 'iot-unit:temperature.imperial.fahrenheit',
                        to: 'iot-unit:temperature.si.celsius',
                        value: 32,
                    };
                    var result = _.convert.convert(value);
                    var expect = 0;

                    assert.strictEqual(result, expect);
                });
            });
            describe('c->k', function() {
                it('default', function() {
                    var value = {
                        from: 'iot-unit:temperature.si.celsius',
                        to: 'iot-unit:temperature.si.kelvin',
                        value: 0,
                    };
                    var result = _.convert.convert(value);
                    var expect = 273.15;

                    assert.strictEqual(result, expect);
                });
            });
            describe('percent->unit', function() {
                it('default', function() {
                    var value = {
                        from: 'iot-unit:math.fraction.percent',
                        to: 'iot-unit:math.fraction.unit',
                        value: 60,
                    };
                    var result = _.convert.convert(value);
                    var expect = 0.6;

                    assert.strictEqual(result, expect);
                });
            });
            describe('unit->percent', function() {
                it('default', function() {
                    var value = {
                        from: 'iot-unit:math.fraction.unit',
                        to: 'iot-unit:math.fraction.percent',
                        value: 0.45,
                    };
                    var result = _.convert.convert(value);
                    var expect = 45;

                    assert.strictEqual(result, expect);
                });
            });
        });
        describe('deep', function() {
            describe('f->k', function() {
                it('default', function() {
                    var value = {
                        from: 'iot-unit:temperature.imperial.fahrenheit',
                        to: 'iot-unit:temperature.si.kelvin',
                        value: 72,
                    };
                    var result = _.convert.convert(value);
                    var expect = 295.372;

                    assert.strictEqual(result, expect);
                });
            });
            describe('k->f', function() {
                it('default', function() {
                    var value = {
                        from: 'iot-unit:temperature.si.kelvin',
                        to: 'iot-unit:temperature.imperial.fahrenheit',
                        value: 295.372,
                    };
                    var result = _.convert.convert(value);
                    var expect = 72;

                    assert.strictEqual(result, expect);
                });
            });
        });
        describe('no conversion', function() {
            it('default', function() {
                var value = {
                    from: 'iot-unit:temperature.si.kelvin',
                    to: 'iot-unit:temperature.si.kelvin',
                    value: 295.372,
                    precision: false,   // will be ignored
                };
                var result = _.convert.convert(value);
                var expect = 295.372;

                assert.strictEqual(result, expect);
            });
        });
        describe('unknowns', function() {
            it('from', function() {
                var value = {
                    from: 'iot-unit:temperature.si.BLETCH',
                    to: 'iot-unit:temperature.si.kelvin',
                    value: 295.372,
                };

                assert.throws(function() {
                    _.convert.convert(value);
                }, Error);
            });
            it('to', function() {
                var value = {
                    from: 'iot-unit:temperature.si.kelvin',
                    to: 'iot-unit:temperature.si.BLARG',
                    value: 295.372,
                };

                assert.throws(function() {
                    _.convert.convert(value);
                }, Error);
            });
        });
        describe('precision', function() {
            it('1', function() {
                var value = {
                    from: 'iot-unit:temperature.si.kelvin',
                    to: 'iot-unit:temperature.imperial.fahrenheit',
                    value: 295.3,
                    precision: 1,
                };
                var result = _.convert.convert(value);
                var expect = 71.9;

                assert.strictEqual(result, expect);
            });
            it('2', function() {
                var value = {
                    from: 'iot-unit:temperature.si.kelvin',
                    to: 'iot-unit:temperature.imperial.fahrenheit',
                    value: 295.3,
                    precision: 2,
                };
                var result = _.convert.convert(value);
                var expect = 71.87;

                assert.strictEqual(result, expect);
            });
            it('3', function() {
                var value = {
                    from: 'iot-unit:temperature.si.kelvin',
                    to: 'iot-unit:temperature.imperial.fahrenheit',
                    value: 295.31,
                    precision: 3,
                };
                var result = _.convert.convert(value);
                var expect = 71.888;

                assert.strictEqual(result, expect);
            });
            it('true', function() {
                // 3 places max
                var value = {
                    from: 'iot-unit:temperature.si.kelvin',
                    to: 'iot-unit:temperature.imperial.fahrenheit',
                    value: 295.31,
                    precision: true,
                };
                var result = _.convert.convert(value);
                var expect = 71.888;

                assert.strictEqual(result, expect);
            });
            it('false', function() {
                // unlimited places max
                var value = {
                    from: 'iot-unit:temperature.si.kelvin',
                    to: 'iot-unit:temperature.imperial.fahrenheit',
                    value: 295.31,
                    precision: false,
                };
                var result = _.convert.convert(value);
                var expect = 71.88800000000005;

                assert.strictEqual(result, expect);
            });
        });
    });
});
