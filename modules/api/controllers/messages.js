"use strict";
const TransactionsModel = require('../../common/model').Transactions;
const common = require('../../../util/common')
const Accounts_messages = require('../../common/model').Accounts_messages;
const sqlPromise = require('../../../util/commonSQLExec');
const Bignumber = require('bignumber.js');
const config = require('../../../util/config')
/**
 * 查询交易列表
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
exports.messageslist = (req, res, next) => {
    let data = req.data;
    let obj ={
        page: Number(data.page) || 1,
        pageSize: Number(data.pageSize) || 10,
        type: data.type || 0,
    }
    TransactionsModel.getAllTransactionList(obj ,async (err, result) => {
        let len = result.length;
        let re =[];
        for(let i = 0; i< len; i ++){
            let r = await common.redisHget('transactions',result[i].hash);
            if(r != null){
                let am =  new Bignumber(r.amount).plus((new Bignumber(r.amount_point)).div(new Bignumber(config.EXOValue.toString()))).toFixed();
                result[i] = r;
                result[i].amount = am;
            }else {
                let k = await TransactionsModel.getHashResult(result[i].hash);
                result[i] =k[0];
                let an =  new Bignumber(k[0].amount).plus((new Bignumber(k[0].amount_point)).div(new Bignumber(config.EXOValue.toString()))).toFixed();
                result[i].amount = an;
            }
            delete result[i].message;
            re.push(result[i]);
        }
        let results = {
            list: re,
            currPage: Number(data.page),
            pageSize: Number(data.pageSize) || 10
        }
        TransactionsModel.getAllTransactionListPage(obj, (err, result1) =>{
            if(err)  return next(new Error(err));
            results.totalCount = result1;
            results.totalPage = Math.ceil(result1/10);
            res.success(results);
        });
    });

}

/**
 * coinbig交易所需要接口
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
exports.transactionsList = (req, res, next) => {
    let data = req.data;
    if(!data.offset || data.offset =="" || data.offset == "0") return next(new Error(`offset 字段不能为空或为0！`));
    let obj ={
        offset: data.offset.toString(),
        pageSize: 100,
    }
    TransactionsModel.getAllTransactionList(obj ,async (err, result) => {
        let len = result.length;
        let re =[];
        for(let i = 0; i< len; i ++){
            let r = await common.redisHget('transactions',result[i].hash);
            if(r != null){
               result[i] = r;
            }else {
                let k = await TransactionsModel.getHashResult(result[i].hash);
                result[i] =k[0];
            }
            let amount = new Bignumber(result[i].amount).times(new Bignumber("1000000000000000000")).plus(new Bignumber(result[i].amount_point)).toFixed();
            let fee = new Bignumber(result[i].fee).times(new Bignumber("1000000000000000000")).plus(new Bignumber(result[i].fee_point)).toFixed();
            result[i].amount = amount;
            result[i].fee = fee;
            delete result[i].amount_point;
            delete result[i].fee_point;
            delete result[i].message;
            re.push(result[i]);
        }
        let results = {
            list: re
        }
        res.success(results);
    });

}

/**
 * 获取总页数
 * @param req
 * @param res
 * @param next
 */
exports.getTotalPage = (req, res, next) => {
    let obj={}
    let results={}
    TransactionsModel.getAllTransactionListPage(obj, (err, result1) =>{
        if(err)  return next(new Error(err));
        results.totalCount = result1;
        results.totalPage = Math.ceil(result1/100);
        res.success(results);
    });
}


/**
 * 获取消息信息
 * @param req
 * @param res
 * @param next
 */
exports.messagesinfo = (req, res, next) => {
    let data = req.data;
    //console.log(data)
    let obj={};
    let results;
    let hash;
    let rest = {};
    Object.keys(data).forEach(function(key){
        obj[key] = data[key];
        if(key=='hash') {
            //console.log(111)
            hash =data[key];
        }
    });
    TransactionsModel.getHashTransaction(obj, (err, result) =>{
        if(err)  next(new Error(err));
        results = result;
        rest.msg = result.message;
        if(result.addressFrom == '' && result.addressTo == ''){
            results.amount = '0';
            results.amount_point = '0';
            results.fee = '0';
            results.fee_point = '0';
        }
        delete results.message;
        if(rest.msg){
            let json = {
                timestamp : JSON.parse(rest.msg).timestamp,
                preHash: JSON.parse(rest.msg).preHash,
                snapshotPoint: JSON.parse(rest.msg).snapshotPoint
            }
            results.message = JSON.stringify(json)
        }
        TransactionsModel.getBalance(data.address || '', (err, result1) =>{
            if(err)  return next(new Error(err));
            if(data.address){
                results.total = result1 || 0;
            }
            if(hash){
                TransactionsModel.getHashResult(hash,(err, result2) => {
                    if(result2[0] == null){
                        next(new Error(''))
                    }else {
                        results.type = JSON.parse(result2[0].message).type;
                        res.success(results)
                    }

                });
            }else{
                res.success(results)
            }
        });
    });
}


/**
 * 获取消息信息
 * @param req
 * @param res
 * @param next
 */
exports.messagesinfoToken = (req, res, next) => {
    let data = req.data;
    //console.log(data)
    let obj={};
    let results;
    let hash;
    let rest = {};
    Object.keys(data).forEach(function(key){
        obj[key] = data[key];
        if(key=='hash') {
            //console.log(111)
            hash =data[key];
        }
    });
    TransactionsModel.getHashTransactionToken(obj, (err, result) =>{
        if(err)  next(new Error(err));
        results = result;
        rest.msg = result.message;
        if(result.addressFrom == '' && result.addressTo == ''){
            results.amount = '0';
            results.amount_point = '0';
            results.fee = '0';
            results.fee_point = '0';
        }
        delete results.message;
        if(rest.msg){
            let json = {
                timestamp : JSON.parse(rest.msg).timestamp,
                preHash: JSON.parse(rest.msg).preHash,
                snapshotPoint: JSON.parse(rest.msg).snapshotPoint
            }
            results.message = JSON.stringify(json)
        }
        TransactionsModel.getBalance(data.address || '', (err, result1) =>{
            if(err)  return next(new Error(err));
            if(data.address){
                results.total = result1 || 0;
            }
            if(hash){
                TransactionsModel.getHashResult(hash,(err, result2) => {
                    if(result2[0] == null){
                        next(new Error(''))
                    }else {
                        results.type = JSON.parse(result2[0].message).type;
                        res.success(results)
                    }

                });
            }else{
                res.success(results)
            }
        });
    });
}

/**
 * 获地址余额
 * @param req
 * @param res
 * @param next
 */
exports.getBalance = (req, res, next) => {
    let data = req.data;
    if(!data.address || data.address =="") return next(new Error(`address 字段不能为空！`));
        TransactionsModel.getBalance(data.address || '', (err, result1) =>{
            if(err)  return next(new Error(err));
                res.success(new Bignumber(result1).times(new Bignumber("1000000000000000000")).toFixed()|| 0)
        });

}

// exports.testInsert = (req, res, next) => {
//     let data = req.data;
//     TransactionsModel.testInsert(JSON.parse(data.data));
//     res.success(0)
//
// }

/**
 * 全网预览
 * @param req
 * @param res
 * @param next
 * @returns {Promise<void>}
 */
exports.preview = async (req, res, next) => {
    let obj = {};
    let accountsTotal =  await common.getRedis('accountsTotal');
    let messageTotal =  await common.getRedis('messageTotal');
    obj.accountsTotal = accountsTotal;
    obj.messageTotal = messageTotal;
    let result = await TransactionsModel.getMessageInfo()
    obj.runtime = result.runTime;
    //obj.shardnumber = (common.urlList.length).toString()
    obj.shardNumber = result.shardNumber;
    obj.tps = result.tps;
    obj.lightNode = result.lightNode;
    obj.contributingSpace = result.contributingSpace
    res.success(obj)

}

/**
 * 获取地址、消息数量
 * @param req
 * @param res
 * @param next
 * @returns {Promise<void>}
 */
exports.graphdatas = async (req, res, next) => {
    try {
        let obj = await Accounts_messages.selectAll();
        res.success(obj)
    }catch (e) {
        next (new Error(e.toString()))
    }
}


/**
 * @description:
 *
 * @param: 锁仓数据统计
 * @return
 * @author:
 * @time:
 */
exports.lockedWarehouse = async (req, res, next) => {
    let data = req.data;
    let obj={
        address: data.address,
        page: data.page,
        pageSize: data.pageSize
    }
    try {
        let result = await TransactionsModel.selectAll(obj);
        res.success(result)
    }catch (e) {
        next (new Error(e.toString()))
    }
}


exports.delTransactions = async (req, res, next) => {
    let obj ='数据清除成功!'

    let sql ="delete from t_transactions_0 ";
    let sql1 ="delete from t_transactions_index";
    let sql3 ="delete from t_token_info";
    try{
        let cmds =[];
        cmds.push({sql:sql,args:[]});
        cmds.push({sql:sql1,args:[]});
        cmds.push({sql:sql3,args:[]});
        await sqlPromise.executeTrans(cmds);
        Redis.flushdb()
        res.success(obj)
    }catch (e) {
        console.log('delete: ',e);
        next (new Error(e.toString()))

    }
}


