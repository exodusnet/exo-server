"use strict";
const userModel = require('../../common/model').User;

/**
 * 查询User信息
 * @param req
 * @param res
 * @param next
 */
exports.getUser = (req, res, next) =>{
    let data = req.data;
    if(!data.address || data.address =="") return next(new Error(`address 字段不能为空！`));
   userModel.getByAddress({address: data.address},(err,result) => {
       if (err) return next(err);
       res.success(result);
   })
}