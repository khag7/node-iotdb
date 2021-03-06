/*
 *  test_thing_set_with.js
 *
 *  David Janes
 *  IOTDB
 *  2016-01-06
 */

"use strict";

var assert = require("assert")
var _ = require("../helpers")

var iotdb = require("../iotdb");
var thing_manager = require("../thing_manager");

require('./instrument/iotdb');

var _make_thing = function(callback) {
    var t = thing_manager.make();
    t._reset();
    
    var ts = t.connect("Test", {}, {
        "schema:name": "The Thing Name",
        "schema:description": "My Thing",
        "iot:zone": [ "Glasgow Place", "Second Floor", "Bedroom" ],
        "iot:facet": [ "iot-facet:switch", "iot-facet:lighting", "iot-facet:something" ],
        "iot:thing-number": 32,
    });
    ts.on("thing", function() {
        callback(ts);
    });
};

describe('test_thing_set', function() {
    describe('with', function(done) {
        describe('with_code', function(done) {
            it('matching', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_code("test");

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('not matching', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_code("not-a-name");

                    assert.strictEqual(ms.count(), 0);
                    assert.ok(ms.empty());
                    done();
                });
            });
        });
        describe('with_name', function(done) {
            it('matching', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_name("The Thing Name");

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('matching with array', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_name([ "The Thing Name", "not-a-name", ]);

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('not matching', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_name("not-a-name");

                    assert.strictEqual(ms.count(), 0);
                    assert.ok(ms.empty());
                    done();
                });
            });
        });
        describe('with_number', function(done) {
            it('matching', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_number(32);

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('matching with array', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_number([ 32, 21, ]);

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('not matching', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_number(21);

                    assert.strictEqual(ms.count(), 0);
                    assert.ok(ms.empty());
                    done();
                });
            });
            it('*matching* with string argument that looks like it should match', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_number("32");

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
        });
        describe('with_zone', function(done) {
            it('matching', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_zone("Glasgow Place");

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('matching with array', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_zone([ "Glasgow Place", "Second Floor", "Bedroom"]);

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('matching with array with some non matching items', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_zone([ "Bedroom", "d", "e"]);

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('not matching', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_zone("e");

                    assert.strictEqual(ms.count(), 0);
                    assert.ok(ms.empty());
                    done();
                });
            });
            it('not matching with array', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_zone([ "e", "f", "g" ]);

                    assert.strictEqual(ms.count(), 0);
                    assert.ok(ms.empty());
                    done();
                });
            });
        });
        describe('with_facet', function(done) {
            it('matching', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_facet("iot-facet:switch");

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('matching with array', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_facet([ "iot-facet:switch", "iot-facet:lighting", "iot-facet:something"]);

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('matching with array with some non matching items', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_facet([ "iot-facet:something", "d", "e"]);

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('not matching', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_facet("e");

                    assert.strictEqual(ms.count(), 0);
                    assert.ok(ms.empty());
                    done();
                });
            });
            it('not matching with array', function(done) {
                _make_thing(function(ts) {
                    var ms = ts.with_facet([ "e", "f", "g" ]);

                    assert.strictEqual(ms.count(), 0);
                    assert.ok(ms.empty());
                    done();
                });
            });
        });
        describe('with_zone', function(done) {
            it('matching', function(done) {
                _make_thing(function(ts) {
                    var thing = ts.any();
                    var ms = ts.with_id(thing.thing_id());

                    assert.strictEqual(ms.count(), 1);
                    done();
                });
            });
            it('not matching', function(done) {
                _make_thing(function(ts) {
                    var thing = ts.any();
                    var ms = ts.with_id("notathingid");

                    assert.strictEqual(ms.count(), 0);
                    assert.ok(ms.empty());
                    done();
                });
            });
        });
    });
});
