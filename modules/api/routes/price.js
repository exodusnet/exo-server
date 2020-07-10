"use strict";
const express = require('express');
const _ = require('lodash');
const router = express.Router();
const priceController = require('../controllers/price');

_.forEach(priceController, function (action, name) {
    router.post('/' + name, action);
});


module.exports = router;