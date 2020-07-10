"use strict";
const express = require('express');
const _ = require('lodash');
const router = express.Router();
const addressController = require('../controllers/address');

_.forEach(addressController, function (action, name) {
    router.post('/' + name, action);
});


module.exports = router;