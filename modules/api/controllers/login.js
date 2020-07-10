"use strict";
const userModel = require('../../common/model').User;
const validator = require('validator');

/**
 * 注册，绑定手机号码+地址
 * @param req
 * @param res
 * @param next
 */
exports.register = (req, res, next) =>{
    let data = req.data;
    if(!data.phone || data.phone =="") return next(new Error(`phone 字段不能为空！`));
    if(!data.address || data.address =="") return next(new Error(`address 字段不能为空！`));
    if (!validator.isMobilePhone(data.phone, 'zh-CN')) {
        var err = new Error('手机号码错误!');
        err.code = 401;
        return next(err);
    }
    userModel.addUser(data,(err,result) =>{
        if (err) return next(err);
        res.success(result);
    });
}