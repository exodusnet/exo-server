"use strict";
const express = require('express');
const _ = require('lodash');
const router = express.Router();
const loginController = require('../controllers/login');

_.forEach(loginController, function (action, name) {
    router.post('/' + name, action);
});


module.exports = router;