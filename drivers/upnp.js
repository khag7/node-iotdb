/*
 *  drivers/upnp.js
 *
 *  David Janes
 *  IOTDB.org
 *  2013-12-25
 *
 *  Talk to all UPnP devices
 *
 *  Copyright [2013-2014] [David P. Janes]
 *  
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

"use strict"

var _ = require("../helpers");
var driver = require('../driver')

var u = require("./libs/upnp-controlpoint");
var UpnpControlPoint = u.UpnpControlPoint;

var DELTA_SCRUB = 60 * 1000
var DELTA_SEARCH = 20 * 1000

/**
 *  Typically this will be created by one of
 *  the discover_* functions
 */
var UPnPDriver = function(upnp_device) {
    var self = this;
    driver.Driver.prototype.driver_construct.call(self);

    if (upnp_device !== undefined) {
        self.upnp_device = upnp_device;
        self.upnp_device.on("device-lost", function() {
            console.log("UPnPDriver: device-lost message received")
            self._forget_device()
        })
    }

    return self;
}

UPnPDriver.prototype = new driver.Driver;

/* --- class methods --- */
var _cp = undefined;

UPnPDriver.cp = function() {
    if (_cp === undefined) {
        _cp = new UpnpControlPoint();

        // we periodically kick off a new search to find devices that have come online
        setInterval(function() {
            _cp.search()
            _cp.scrub(DELTA_SCRUB)
        }, DELTA_SEARCH)
    }

    return _cp
}

/**
 *  See {@link Driver#discover Driver.discover}
 *  - Scan the local network for UPnPs
 */
UPnPDriver.prototype.discover = function(paramd, discover_callback) {
    var self = this;

    var cp = UPnPDriver.cp()

    cp.on("device", function(upnp_device) {
        self._found_device(discover_callback, upnp_device);
    });

    // always search to speed up device discovery
    cp.search();
}

/**
 *  See {@link Driver#reachable}
 */
UPnPDriver.prototype.reachable = function() {
    var self = this

    if (!self.upnp_device) {
        return false
    }

    return true
}

/**
 *  Forget about this connect. This will render
 *  this Thing/Driver unreachable
 */
UPnPDriver.prototype._forget_device = function() {
    var self = this

    if (!self.upnp_device) {
        return
    }
    
    if (_cp) {
        _cp.forget(self.upnp_device)
    }

    self.upnp_device = null
    self.pulled()
}

/**
 *  A new Driver can be made (maybe) with the upnp_device
 */
UPnPDriver.prototype._found_device = function(discover_callback, upnp_device) {
    var self = this;

    console.log("- UPnPDriver._found_device", "deviceType", upnp_device.deviceType);
    discover_callback(new UPnPDriver(upnp_device))
}

/**
 */
UPnPDriver.prototype._service_by_urn = function(service_urn) {
    var self = this;

    if (!self.upnp_device) {
        return null
    }

    if (!self.upnp_device.services) {
        return null
    }

    for (var s_name in self.upnp_device.services) {
        var service = self.upnp_device.services[s_name];
        if (service.serviceType == service_urn) {
            return service;
        }
    }

    return null;
}

/* --- --- */
/**
 *  See {@link Driver#identity}
 */
UPnPDriver.prototype.identity = function(kitchen_sink) {
    var self = this;

    if ((self.__identityd === undefined) || kitchen_sink) {
        var identityd = {}
        identityd["driver"] = _.expand("iot-driver:upnp")

        if (self.upnp_device) {
            identityd["deviceType"] = self.upnp_device.deviceType
            identityd["udn"] = self.upnp_device.udn

            _.thing_id(identityd);

            if (kitchen_sink) {
                var keys = _.keys(self.upnp_device)
                for (var kx in keys) {
                    var key = keys[kx]
                    if (identityd[key] !== undefined) {
                        continue;
                    }

                    var value = self.upnp_device[key];
                    if (!_.isString(value)) {
                        continue;
                    }

                    identityd[key] = value;
                }
            }
        }

        
        if (kitchen_sink) {
            return identityd
        }

        self.__identityd = identityd;
    }

    return self.__identityd;
}


/**
 *  See {@link Driver#setup Driver.setup}
 */
UPnPDriver.prototype.setup = function(paramd) {
    var self = this;

    if (!self.upnp_device) {
        return
    }

    console.log("- UPnDriver.setup", paramd.setupd);

    /* chain */
    driver.Driver.prototype.setup.call(self, paramd);

    var service_urns = paramd.setupd['subscribe'];
    if (service_urns) {
        for (var sui = 0; sui < service_urns.length; sui++) {
            var service_urn = service_urns[sui];
            var service = self._service_by_urn(service_urn);
            if (!service) {
                console.log("- UPnPDriver.setup: service not found", service_urn);
            } else {
                var _on_failed = function(code, error) {
                    console.log("- UPnPDriver.setup/_on_failed", code, error)
                    self._forget_device()
                    _remove_listeners()
                }

                var _on_stateChange = function(valued) {
                    var driverd = {};
                    driverd[service_urn] = valued;

                    self.pulled(driverd)

                    console.log("- UPnPDriver.setup/_on_stateChange", driverd);
                }

                var _on_subscribe = function(error, data) {
                    if (error) {
                        console.log("- UPnPDriver.setup/subscribe", service_urn, error);
                        self._forget_device()
                        _remove_listeners()
                    }
                }

                var _remove_listeners = function() {
                    service.removeListener('failed', _on_failed);
                    service.removeListener('stateChange', _on_stateChange);
                }

                console.log("- UPnPDriver.setup: subscribe", service_urn);
                service.on("failed", _on_failed)
                service.on("stateChange", _on_stateChange)
                service.subscribe(_on_subscribe)
            }
        }
    }

    return self;
}


/**
 *  See {@link Driver#push}
 */
UPnPDriver.prototype.push = function(paramd) {
    var self = this;

    if (!self.upnp_device) {
        return
    }

    console.log("- UPnPDriver.push called", paramd.driverd);

    for (var service_urn in paramd.driverd) {
        var service = self._service_by_urn(service_urn);
        if (!service) {
            console.log("- UPnPDriver.push", "service not found", service_urn);
            continue;
        }

        var serviced = paramd.driverd[service_urn];

        for (var action_id in serviced) {
            var actiond = serviced[action_id];
            console.log("- UPnPDriver.push", service_urn, action_id, actiond);
            service.callAction(action_id, actiond, function(err, buf) {
                if (err) {
                    console.log("- UPnPDriver.push", err, buf);
                }
            });
        }
    }

    return self;
}

/**
 *  Request the Driver's current state. It should
 *  be called back with <code>callback</code>
 *  <p>
 *  See {@link Driver#pull Driver.pull}
 */
UPnPDriver.prototype.pull = function() {
    var self = this;

    console.log("- UPnPDriver.pull called");
    return self;
}

/**
 *  Request the Driver's metadata.
 *  <p>
 *  See {@link Driver#meta Driver.meta}
 */
UPnPDriver.prototype.meta = function() {
    var self = this

    if (!self.upnp_device) {
        return
    }

    var metad = {}

    for (var key in self.upnp_device) {
        var value = self.upnp_device[key]
        if (_.isString(value) || _.isNumber(value) || _.isBoolean(value)) {
            metad[key] = value
        }
    }

    return metad
}

/*
 *  API
 */
exports.Driver = UPnPDriver
