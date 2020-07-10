/*jslint node: true */
"use strict";
var EventEmitter = require('events').EventEmitter;

var eventEmitter = new EventEmitter();
eventEmitter.setMaxListeners(20);

module.exports = eventEmitter;
