"use strict";
/**
 * Created by walter on 2016/6/12.
 */
const util = require('util');
const moment = require('moment');
const validator = require('validator');
const _ = require('lodash');
const Mysql = require("mysql");
const sqlExec = require('../../../util/commonSQLExec');
const baseModel = require('./baseModel');
const utils = require('../../../util/functions');

/*用户基本类型*/
function User() {
    this.table = 'user';
    baseModel.call(this);
    this.primary_key = 'user_id';

    this.insert_require = ['phone', 'address', 'create_time', 'last_login_time'];
    this.rules = [];
}
util.inherits(User, baseModel);



User.prototype.search = function (queryParams, callback) {
    var condition = {};
    var offset = 0;
    var limit = 5;
    var order = 'create_time';
    var sort = 'desc';

    if (!_.isNil(queryParams['limit'])) {
        limit = queryParams['limit'] || 0;
        queryParams['limit'] = undefined;
    }
    if (!_.isNil(queryParams['offset'])) {
        offset = queryParams['offset'] || 0;
        queryParams['offset'] = undefined;
    }
    if (limit) {
        condition['limit'] = offset + ',' + limit;
    }

    if (!_.isNil(queryParams['order'])) {
        order = validator.trim(queryParams['order']);
        queryParams['order'] = undefined;
    }
    if (!_.isNil(queryParams['sort'])) {
        sort = validator.trim(queryParams['sort']);
        queryParams['sort'] = undefined;
    }
    condition['order'] = order + ' ' + sort;

    if (!_.isNil(queryParams['nickname'])) {
        // console.log(queryParams);
        queryParams['nickname'] = ['like', Mysql.escape('%' + queryParams['nickname'] + '%')]
    }


    this.select(queryParams, condition, callback);

};

/**
 * 根据用户ID获取用户信息
 * @param user_id
 * @param callback
 */
User.prototype.getById = function (user_id, callback) {

    const queryParams = {
        "user_id": user_id,
        "is_register_user": 1  //表示已经注册
    };

    queryParams['field'] = 't_user.*,ageOfBirthday(birthday) AS age';

    this.find(queryParams, function (err, data) {

        if (err) return callback(err);

        callback(null, data);
    });
};

/**
 * 根据用户Phone获取用户信息
 */
User.prototype.getByPhone = function (phone, callback) {

    const queryParams = {
        "phone": phone
    };

    queryParams['field'] = 't_user.*,ageOfBirthday(birthday) AS age';

    this.find(queryParams, function (err, data) {
        if (err) return callback(err);
        callback(null, data);
    });
};
/**
 * 根据用户地址获取用户信息
 */
User.prototype.getByAddress = function (address, callback) {

    this.find(address, function (err, data) {
        if (err) return callback(err);
        callback(null, data);
    });
};

/**
 *  更新用户
 * @param {object} queryParams
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
User.prototype.updateUser = function (queryParams, data, callback) {
    try {
        this.checkRule(data);

    } catch (err) {
        err.code = 400;
        return callback(err);
    }

    this.update(queryParams, data, callback);

};

/**
 * 新增用户
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
User.prototype.addUser = function (data, callback) {

    if (_.isNil(data.create_time)) {
        data.create_time = moment().unix();
    }

    if (_.isNil(data.last_login_time)) {
        data.last_login_time = 0;
    }

    // try {
    //   this.checkRequire(data);
    //   this.checkRule(data);
    // } catch (err) {
    //   return callback(err);
    // }

    this.add(data, callback);
};

module.exports = User;