"use strict";
const AddressesModel = require('../../common/model').Addresses;

/**
 * 首次创建钱包注册地址或直接从共识网拉取所有地址记录
 * @param req
 * @param res
 * @param next
 */
exports.add = async (req, res, next) =>{
    let data = req.data;
    if(!data.address || data.address =="") return next(new Error(`address 字段不能为空！`));
    let obj = {
        address: data.address,
        create_date: Math.round(Date.now())
    }
    AddressesModel.add(obj, (err, res) => {
        if(err)  return next(err);
        res.success('');
    })
}

/**
 * 查询地址是否注册
 * @param req
 * @param res
 * @param next
 * @returns {Promise<*>}
 */
exports.find = async (req, res, next) =>{
    let data = req.data;
    if(!data.address || data.address =="") return next(new Error(`address 字段不能为空！`));
    let obj = {
        address: data.address,
    }
    AddressesModel.find(obj, (err, res) => {
        if(err)  return next(new Error(err));
        res.success(res);
    })
}