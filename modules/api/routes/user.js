"use strict";
const express = require('express');
const _ = require('lodash');
const router = express.Router();
const userController = require('../controllers/user');

_.forEach(userController, function (action, name) {
    router.post('/' + name, action);
});


module.exports = router;