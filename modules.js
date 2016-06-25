/*
 *  modules.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-02-16
 *  "Valentines's Day"
 *
 *  Copyright [2013-2016] [David P. Janes]
 *
 *  Installed Module Management / Package Manager
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

"use strict";

const _ = require('./helpers');

const model = require('./model');

const events = require('events');
const util = require('util');
const fs = require('fs');
const path = require('path');

const logger = _.logger.make({
    name: 'iotdb',
    module: 'modules',
});

const make = () => {
    const self = Object.assign({}, events.EventEmitter.prototype);
    const iotdb = require("iotdb");

    events.EventEmitter.call(self);
    self.setMaxListeners(0);

    const _moduled = {}
    let _bridges = [];
    let _bindings;

    /**
     *  Return all the Modules that have been registered
     */
    self.modules = () => _.values(this._moduled);

    /**
     *  Manually add another module
     *
     *  <Module>.use is like setup, except that it is only
     *  called if you explicitly use use().
     */
    self.use = function (module_name, module) {
        if (!module) {
            module = require(module_name);
        }

        _moduled[module_name] = module
        _load_bridges();

        if (module.setup) {
            module.setup(iotdb);
        }
        if (module.use) {
            module.use();
        }
    };


    const _load_master = () => {
        var moduled = iotdb.keystore().get("modules");
        
        _.mapObject(moduled, ( module_folder, module_name) => {
            try {
                var module = require(module_folder);
            } catch (x) {
                logger.error({
                    method: "_load",
                    module_name: module_name,
                    module_folder: module_folder,
                    cause: "likely the module being imported is not set up correctly",
                    error: _.error.message(x),
                    stack: x.stack,
                }, "unexpected exception loading module");
                return;
            }

            module.module_name = module_name;
            module.module_folder = module_folder;

            _moduled[module_name] = module
        });
    };

    const _load_bridges = () => {
        _bridges = _.values(_moduled)
            .filter(module => module.Bridge)
            .map(module => {
                module.Bridge.module_name = module.module_name;
                module.Bridge.bridge_name = _.id.to_dash_case((new module.Bridge()).name());
                return module;
            });
    };

    /**
     *  A module is a complete package of code, corresponding
     *  to an NPM package (which would have been a better name).
     *  A module has one Bridge, one or more Bindings, and
     *  one or more Models
     *  <p>
     *  This will return the module with the module_name,
     *  or undefined if not found.
     */
    self.module = (module_name) => self._moduled[module_name];

    /**
     *  The Bridge is the code that knows how to talk to
     *  Things. It can be further parameterized by a Binding.
     *  <p>
     *  There is one Bridge per Module (maybe more in the future).
     */
    self.bridges = () => _bridges;

    /**
     *  Find a bridge by the *MODULES* name. For the module
     *  part we don't use the Bridge's self-identified
     *  name except for debug purposes
     */
    self.bridge = function (module_name) {
        const module = _moduled[module_name];

        return module && module.Bridge ? module.Bridge : null;
    };

    const _setup_binding = binding => {
        if (!binding) {
            return;
        } else if (!binding.bridge) {
            return;
        } else if (!binding.model) {
            return;
        }

        if (!_.is.Model(binding.model)) {
            binding.model = model.make_model_from_jsonld(binding.model);
        }

        if (!binding.model_code) {
            binding.model_code = (new binding.model()).code();
        } else {
            /* morph the model's code -- see model_maker */
            binding.model_code = _.id.to_dash_case(binding.model_code);
            var old_model = binding.model;
            var new_model = function() {
                old_model.call(this);
                this.__code = binding.model_code;
            }
            new_model.prototype = new old_model();

            binding.model = new_model;
        }

        return binding;
    }

    const _setup_bindings = () => {
        if (!_bindings) {
            _bindings = _.flatten(_.values(_moduled)
                .filter(module => module.bindings)
                .map(module => module.bindings)
                .map(bindings => bindings.map(_setup_binding)), true);
        }

        return _bindings;
    };

    self.bindings = () => _setup_bindings()
        .filter(binding => iotdb.keystore().get("/enabled/modules/" + binding.bridge.module_name, true));

    const _load_setup = () => _.values(_moduled)
        .filter(module => module.setup)
        .forEach(module => module.setup(iotdb));

    _load_master();
    _load_bridges();
    _load_setup();

    return self;
}

let _modules;

/**
 */
const modules = () => {
    if (!_modules) {
        _modules = make();
    }

    return _modules;
}

/*
 *  API
 */
exports.modules = modules;
