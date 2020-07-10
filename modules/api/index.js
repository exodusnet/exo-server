"use strict";
const express = require('express');
const api = express();
const login = require('./routes/login');
const user = require('./routes/user');
const transactions = require('./routes/transactions');
const address = require('./routes/address');
const messages = require('./routes/messages');
const price = require('./routes/price');
const processForReqAndResp = require('../common/middlewares/helper');
const autoLoggerProcess = require('../common/middlewares/autoLogger');
api.use(processForReqAndResp, autoLoggerProcess);
api.use('/login', login);
api.use('/user', user);
api.use('/transactions', transactions);
api.use('/address', address);
api.use('/price', price);
api.use('/', messages);

api.on('mount', function (parent) {
    console.log("Api Module is mounted at " + api.mountpath);
});


module.exports = api;