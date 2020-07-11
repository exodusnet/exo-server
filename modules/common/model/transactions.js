"use strict";

/**
 *
 */
const util = require('util');
const moment = require('moment');
const _ = require('lodash');
let log_path = process.cwd()+'/log/';
//let error_log = log_path +'errors/error_' + moment().format("YYYY_MM_DD")+'/error-' + moment().format("YYYY_MM_DD_HH") + '.log';
const baseModel = require('./baseModel');
const webHelper = require('../../../util/webhelper');
const common = require('../../../util/common');
var  Addresses = require('./addresses');
const Transaction_index = require('./transaction_index');
const TokenIfno = require('./tokenInfo');
const TokenInfoModel = new TokenIfno();
const sqlPromise = require('../../../util/commonSQLExec');
const Bignumber = require('bignumber.js');
const redis = require('../../../util/common')
//var AddressesModel = new Addresses();
var Transaction_indexModel = new Transaction_index();
const config = require('../../../util/config')
const contract = require('../../../util/contract')
//const Accounts_messages = require('../../common/model').Accounts_messages;
//fs.appendFileSync(log_path + 'sql-' + moment().format("MM-DD") + '.log', moment().format("MM-DD H:m:s") + "  " + sql + "\n");

let tranList = [];

/*用户基本类型*/
function Transations() {
    this.table = 'transactions_0';
    baseModel.call(this);
    this.primary_key = 'hash';
    this.insert_require = ['amount', 'fee', 'addressFrom', 'addressTo', 'result', 'remark','amount_point', 'fee_point', 'creation_date','type'];
    this.rules = [];
}
util.inherits(Transations, baseModel);

function inArray(search,array){
    for(var i in array){
        if(array[i]==search){
            return true;
        }
    }
    return false;
}

/**
 * 本地发起交易成功后
 * @param opts
 * @returns {Promise<*>}
 */
Transations.prototype.insertTransactions = async function(opts) {
    try{
        let data = opts;
        let amountt = data.amount;
        let amount = parseInt(amountt.replace(/"/g,'').substring(-1,amountt.length-18) ? amountt.replace(/"/g,'').substring(-1,amountt.length-18) : 0);
        let amountPoint = parseInt(amountt.replace(/"/g,'').substring(amountt.length-18,amountt.length) ? amountt.replace(/"/g,'').substring(amountt.length-18,amountt.length) : 0) ;

        let fee = data.fee*data.nrgPrice+"";
        let feeInt = parseInt(fee.replace(/"/g,'').substring(-1,fee.length-18) ? fee.replace(/"/g,'').substring(-1,fee.length-18) : 0);
        let feePoint = parseInt(fee.replace(/"/g,'').substring(fee.length-18,fee.length) ? fee.replace(/"/g,'').substring(fee.length-18,fee.length) : 0);

        let sql = "INSERT INTO t_transactions_0 (hash,creation_date,amount,fee,addressFrom,addressTo,result,remark,amount_point,fee_point,type,nrgPrice) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";

        let values = [data.signature, data.timestamp, amount, feeInt, data.fromAddress, data.toAddress, "pending",data.note, amountPoint, feePoint,1 , data.nrgPrice]

        let a = await  sqlPromise.promiseSqlWithParameters(sql, values);
        refreshTranList(data.signature,'pending');
        return null;

    }catch (e) {
        console.log(e.toString())
        return e.toString();
    }


}

/**
 * 根据hash更新本地交易
 */
Transations.prototype.updateHashTransactions = async () => {
    let res = await getPendingTransactions();
    if(res){
        _.forEach(res,async function (i) {
            let result =  await getHashResult(i.hash);
            //console.log(`${JSON.stringify(result)}`)
            if(result && result.isStable){
                let flag = result.isValid ? 'good':'final-bad';
                let sql ="update t_transactions_0 set result = ? where hash = ?";
                sqlPromise.promiseSqlWithParameters(sql,[flag, i.hash])
                refreshTranList(i.hash,getResultFromTran(flag))
            }
        })
    }
}


/**
 * 根据hash查询
 * @param hash
 * @param cb
 * @returns {Promise<*>}
 */
// Transations.prototype.getHashResult = async (hash,cb) =>{
//     try{
//         let pubkey ='AoulFnsMkNo1HFZHTQ1SzWwgFVlwVHF39O17FBDs8vIj';
//         let localfullnode = await common.getLocalfullnode(pubkey);
//         if(!localfullnode) return cb(`localfullnode is null`);
//         let result = JSON.parse(await webHelper.httpPost(getUrl(localfullnode, '/v1/gettransaction'), null, buildData({hash})));
//         //console.log(result)
//         if(result.code == 200 && result.data != ''){
//             //return JSON.parse(result.data);
//             cb(null,result.data)
//         }else {
//             cb(null, '')
//         }
//     }catch (e) {
//         console.log('getHashResult: ',e.toString());
//         // return null;
//         cb(e.toString())
//     }
// }

Transations.prototype.getHashResult = async (hash,cb) =>{
    let res = await common.redisHget('transactions',hash);
    if(res != null){
        return cb(null,[res]);
    }else {
        let sql ='SELECT * from t_transactions_0 where hash=?';
        try{
            let result =  await  sqlPromise.promiseSqlWithParameters(sql, [hash]);
            if(result.lenght > 0){
                Redis.hset('transactions',hash, JSON.stringify(result[0]))
            }
            if(cb){
                cb(null,result);
            }else {
                return result;
            }

        }catch (e) {
            console.log('getHashResult: ',e.toString());
            if(cb)
                cb(e.toString());
        }
    }

}


/**
 * 根据hash查询
 * @param hash
 * @param cb
 * @returns {Promise<*>}
 */
async function getHashResult (hash){
    try{
        let pubkey ='AoulFnsMkNo1HFZHTQ1SzWwgFVlwVHF39O17FBDs8vIj';
        //let localfullnode = await common.getLocalfullnode(pubkey);
        let localfullnode = config.EXO_URL;

        let result = JSON.parse(await webHelper.httpPost(getUrl(localfullnode, '/v1/gettransaction'), null, buildData({hash})));
        //console.log(result)
        if(result.code == 200 && result.data != ''){
            return JSON.parse(result.data);
        }
    }catch (e) {
        console.log('getHashResult: ',e.toString());
        // return null;
        return e.toString()
    }
}


/**
 * 调用共识网接口查询TPs
 * @returns {Promise<*>}
 */
Transations.prototype.getMessageInfo = async () =>{
    let creation_date_day = moment().format('YYYY-MM-DD');
    let a = await redis.getRedis(`timeMessage`);
    if(a){
        let t = JSON.parse(a);
        if(t.creation_date_day == creation_date_day){
            return t;
        }

    }
    try{
        let sql = "select * from t_timemessage where creation_date_day=? order by creation_date_day desc limit 1";
        let res = await sqlPromise.promiseSqlWithParameters(sql,[creation_date_day])
        if(res.length> 0 && res[0].creation_date_day == creation_date_day){
            Redis.set('timeMessage',JSON.stringify(res[0]));
            return res[0]
        } else if(res.length == 0 || (res.length> 0 && res[0].creation_date_day != creation_date_day)){
            let localfullnode = config.EXO_URL;
            let result = JSON.parse(await webHelper.httpPost(getUrl(localfullnode, '/v1/getmessageInfo'), null, {}));
            //console.log(result)
            if(result.code == 200 && result.data != ''){
                let lightNode = 2;
                let contributingSpace = "20TB";

                let obj = JSON.parse(result.data)
                let creation_date = Math.round(Date.now());
                let sqlTimeMessage = "insert into t_timemessage (runTime,shardNumber,tps, userCount, creation_date_day,creation_date,lightNode,contributingSpace) values (?,?,?,?,?,?,?,?)";
                await sqlPromise.promiseSqlWithParameters(sqlTimeMessage, [obj.runTime, obj.shardNumber, obj.tps, obj.userCount, creation_date_day, creation_date,lightNode,contributingSpace]);
                let rs = JSON.parse(result.data);
                rs.creation_date_day = creation_date_day;
                rs.lightNode = lightNode;
                rs.contributingSpace = contributingSpace;
                Redis.set('timeMessage',JSON.stringify(rs));
                return rs;
            }
        }

    }catch (e) {
        console.log('getHashResult: ',e.toString());
        //return null;
    }
}

/**
 * 更新所有交易记录
 * @param pubkey
 * @returns {Promise<void>}
 */
let init = false;
let dbsize = 0;
let urls = [
    "3.105.17.5:35793",//6287
    "3.105.17.5:35796",//6288
    "3.121.158.99:35793",//6290
    "3.121.158.99:35796",//6289
    //"3.213.114.163:35793",
    "3.213.114.163:35796",
    "52.221.119.220:35793",
    "52.221.119.220:35796",
    "52.38.78.194:35793",
    "52.38.78.194:35796"
]
Transations.prototype.updateAllTransactionHistory = async (pubkey) =>{
    if(!dbsize) dbsize = await common.dbsizeRedis();
    if(!init) await iniTranList();
    pubkey ='AoulFnsMkNo1HFZHTQ1SzWwgFVlwVHF39O17FBDs8vIj';
    let address ='all';
    try{
        // let localfullnode = await common.getLocalfullnode(pubkey);
        // //console.log(localfullnode)
        // if(!localfullnode) return;
        //localfullnode = urls[2]
        //存储此次交易记录的数组
        let trans = null;

        let tableIndex = 0;
        let offset = 0;
        let sysTableIndex = 0;
        let sysOffset = 0;
        let res = await Transaction_indexModel.select(address);
        //console.log(res)
        if(res.length == 1){
            tableIndex = res[0].tableIndex;
            offset = res[0].offset;
            sysTableIndex = res[0].sysTableIndex ? res[0].sysTableIndex : sysTableIndex;
            sysOffset = res[0].sysOffset ? res[0].sysOffset : sysOffset;
        }else {
            await  Transaction_indexModel.add(address ,tableIndex, offset,sysTableIndex,sysOffset);
        }
        //localfullnode = urls[2];
        let localfullnode = config.EXO_URL;
        let data = await getAllTransactionHistory(localfullnode, address ,tableIndex, offset,sysTableIndex,sysOffset);
        let result = data.result;
        //如果交易记录不为空，需要加入到待处理的数组中。
        if (result != null) {
            if (trans == null) {
                trans = [];
            }
            if (result.length > 0) {
                trans = trans.concat(result);
            }
        }
        if (trans == null && result == null) {
            return;
        }
        data.address = address;
        for (var tran of trans) {
            //console.log(tran.hash)
            if(!tran || tran =='null'){
                //console.log(JSON.stringify(trans))
                continue;
            }

            //let my_tran = _.find(tranList, { id: tran.hash });
            let  my_tran = await redis.redisHget('transactions',tran.hash);
            //console.log(!my_tran);

            //本地存在交易记录，状态是待确认，需要进行状态的更新。

            if (my_tran && tran.isStable && tran.isValid && my_tran.result == 'pending') {
                //await updateTran(tran, data);
            }
            //本地存在交易记录，共识网判定交易非法，需要更新交易状态到本地
            else if (my_tran && tran.isStable && !tran.isValid) {
                //await badTran(tran, data);
            }
            //本地不存在此交易记录，需往本地插入交易记录
            else if (!my_tran) {
                await insertTran(tran, data);
            } else if(my_tran){
                //console.log('else if (my_tran) ',my_tran)
                //console.log('else if (my_tran) ',address,data.tableIndex,data.offset)
                await Transaction_indexModel.update(address,data.tableIndex,data.offset,data.sysTableIndex,data.sysOffset)
                //refreshTranList(tran.hash,getResultFromTran(tran))
            }
            await Transaction_indexModel.update(address,data.tableIndex,data.offset,data.sysTableIndex,data.sysOffset)
        }
    }catch (e) {
        //fs.appendFileSync(error_log, moment().format("MM-DD H:m:s")+": "+e.toString()+"\n");
        console.log("updateAllTransactionHistory: ",e.toString())
    }

}


/**
 * 更新交易记录
 * @param pubkey
 * @returns {Promise<void>}
 */
// Transations.prototype.updateTransactionHistory = async (pubkey) =>{
//     //console.log("=====================")
//     pubkey ='AoulFnsMkNo1HFZHTQ1SzWwgFVlwVHF39O17FBDs8vIj';
//     let addresses =[];
//     try{
//     let localfullnode = await common.getLocalfullnode(pubkey);
//     //console.log(localfullnode)
//     if(!localfullnode) return;
//     addresses = await AddressesModel.select();
//
//     //存储此次交易记录的数组
//     let trans = null;
//     //console.log(tranList.length)
//     _.forEach(addresses,async function (i) {
//         if(!tranList ||tranList.length == 0){
//             await iniTranList();
//         }
//         //console.log(`${i.address}: ${tranList[i.address].length}`)
//         let tableIndex = 0;
//         let offset = 0;
//         let res = await Transaction_indexModel.select(i.address);
//         if(res.length == 1){
//             tableIndex = res[0].tableIndex;
//             offset = res[0].offset;
//         }else {
//           let a =  await  Transaction_indexModel.add(i.address ,tableIndex, offset);
//         }
//         localfullnode = '3.105.17.5:35793'
//        let data = await getTransactionHistory(localfullnode, i.address ,tableIndex, offset);
//         //console.log('data:    ',data)
//         let result = data.result;
//         //如果交易记录不为空，需要加入到待处理的数组中。
//         if (result != null) {
//             if (trans == null) {
//                 trans = [];
//             }
//             if (result.length > 0) {
//                 trans = result;
//             }
//         }
//         if (trans == null && result == null) {
//             return;
//         }
//         for (var tran of trans) {
//             console.log(tran.hash)
//             Redis.sadd('hash',tran.hash)
//             let my_tran = _.find(tranList, { id: tran.hash });
//             // console.log(!my_tran);
//             //本地存在交易记录，状态是待确认，需要进行状态的更新。
//
//             if (my_tran && tran.isStable && tran.isValid && my_tran.result == 'pending') {
//                 await updateTran(tran, data);
//             }
//             //本地存在交易记录，共识网判定交易非法，需要更新交易状态到本地
//             else if (my_tran && tran.isStable && !tran.isValid) {
//                 await badTran(tran, data);
//             }
//             //本地不存在此交易记录，需往本地插入交易记录
//             else if (!my_tran) {
//                await insertTran(tran, data);
//             } else if(my_tran) {
//                 console.log(my_tran)
//                 await Transaction_indexModel.update(i.address,data.tableIndex,data.offset)
//                 refreshTranList(tran.hash,getResultFromTran(tran))
//             }
//         }
//     });
//     }catch (e) {
//         console.log("updateTransactionHistory: ",e.toString())
//     }
//
// }

Transations.prototype.updateAllTransactionHistoryToken = async () =>{
    try{
        let address = 'token';
        let tableIndex = 0;
        let offset = 0;
        let res = await Transaction_indexModel.select(address);
        if(res.length == 1){
            tableIndex = res[0].tableIndex;
            offset = res[0].offset;
        }else {
            await  Transaction_indexModel.add(address ,tableIndex, offset);
        }

        let data = await getAllTransactionHistoryToken(address,tableIndex, offset);
        let result = data.result;
        if(result.length == 0) {
            return;
        }
        for (var tran of result) {
            if(!tran){
                continue;
            }
            let  my_tran = await redis.redisHget('transactions',tran.hash);{
                if (my_tran){
                    await insertTranToken(tran, data);
                }
            }


        }
    }catch (e) {
        console.log('updateAllTransactionHistoryToken: ', e.toString())
    }


}


/**
 * 新增交易记录
 * @param tran
 * @param data
 * @returns {Promise<void>}
 */
async function insertTran(tran, data) {
    //console.log(tran)
    try{
    let reg = /^[A-Z0-9]{32,35}$/
    let updateTime = tran.updateTime;
    let obj = tran;
    tran = JSON.parse(tran.message);
    let address;
    let tokenValue;
    if(tran.hasOwnProperty("data")){
        let b = JSON.parse(new Buffer(tran.data,"base64").toString());
        let callData = b.callData;
        address = callData ? new Buffer(callData.substr(8,64),'hex').toString() : '';
        tokenValue = reg.test(address) ? new Bignumber(parseInt(callData.substr(72).replace(/^0+/,""),16)).plus('0').toFixed() : '0';
        obj.amount = b.value ? b.value: "0";
        tran.fee = b.gasLimit ? b.gasLimit : "0";
        tran.toAddress = b.toAddress ? b.toAddress : "";
        tran.nrgPrice = b.gasPrice ? b.gasPrice : 0;
        if(tran.toAddress == "" && getResultFromTran(obj) == 'good'){
            let res = await getReceipt(tran.signature);
            tran.toAddress = res ? new Buffer.from(res.executionResult,'hex').toString() : "";
        }
        if(reg.test(address)){ //解析代币地址,如果存在需要
            let token = await redis.redisHget('tokenInfo',tran.toAddress)
            let resToken;
            if(!token){
                resToken = await TokenInfoModel.select(tran.toAddress);
                resToken = resToken.length > 0 ? resToken[0] : await contract.addInformation({contractAddress:tran.toAddress});
                let sqlToken = 'insert into t_token_info (address,symbol,totalSupply,decimals,name) values(?,?,?,?,?)'
                let valueToken = [tran.toAddress,resToken.symbol,resToken.totalSupply,resToken.decimals,resToken.name]
                await sqlPromise.promiseSqlWithParameters(sqlToken,valueToken);
                Redis.hset('tokenInfo',tran.toAddress,JSON.stringify(resToken));
            }
        }
    }
    //收款地址不合法
    if(!tran.toAddress || ((tran.toAddress).length !=32&&(tran.toAddress).length!=35 )){
        tran.toAddress = "";
    }


    let amount = obj.amount ? obj.amount : tran.amount;
    if(!amount) {
        amount ="0";
        tran.fee = "0";
    }
    let executionResult = '';
    let error = '';
    let amountInt = amount.replace(/"/g, '').substring(-1, amount.length - 18) ? amount.replace(/"/g, '').substring(-1, amount.length - 18) : 0;
    let amountPoint = amount.replace(/"/g, '').substring(amount.length - 18, amount.length) ? amount.replace(/"/g, '').substring(amount.length - 18, amount.length) : 0;
    let NRG_PRICE = tran.nrgPrice || 0;
    let fee = (tran.fee * NRG_PRICE).toString();
    let feeInt = fee.replace(/"/g,'').substring(-1,fee.length-18) ? fee.replace(/"/g,'').substring(-1,fee.length-18) : 0;
    let feePoint = fee.replace(/"/g,'').substring(fee.length-18,fee.length) ? fee.replace(/"/g,'').substring(fee.length-18,fee.length) : 0;
    if(tran.type == 2){
        let res = await getReceipt(tran.signature);
        if(res){
            fee = (res.gasUsed * NRG_PRICE).toString();
            feeInt = parseInt(fee.replace(/"/g,'').substring(-1,fee.length-18) ? fee.replace(/"/g,'').substring(-1,fee.length-18) : 0);
            feePoint = parseInt(fee.replace(/"/g,'').substring(fee.length-18,fee.length) ? fee.replace(/"/g,'').substring(fee.length-18,fee.length) : 0);
            executionResult = res ? res.executionResult: "";
            error = res ? res.error : "";

        }else {
            feeInt = "0"
            feePoint = "0"
        }


    }
    let Base64 = require('../../../util/base64Code');
    let note = tran.remark ? Base64.decode(tran.remark) : '';
    var fields = "hash, creation_date, amount, fee, addressFrom, addressTo, result, remark, amount_point, fee_point, type, nrgPrice,context,message, eHash, id, lastIdx, isStable, isValid, executionResult,error";
    var values = "?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?";
    var params = [tran.signature, updateTime, amountInt || 0, feeInt || 0, tran.fromAddress, reg.test(address) ? address : tran.toAddress || '', getResultFromTran(obj), note || '', amountPoint || 0, feePoint || 0,tran.type, tran.nrgPrice || 0, tran.context, obj.message, obj.eHash, obj.id, obj.lastIdx ? 1 : 0, obj.isStable ? 1 : 0, obj.isValid ? 1 : 0 ,executionResult ,error];
    if(tran.snapVersion){
        fields += " ,snapVersion";
        values +=",?";
        params.push(tran.snapVersion)
    }
    if(reg.test(address)){//解析代币地址.如果存在则需增加插入字段
        fields += " ,contractAddress,tokenValue";
        values +=",?,?";
        console.log('tokenValue======',tokenValue)
        params.push(tran.toAddress,tokenValue == 'NaN' ? '0' : tokenValue)
    }
    let sql ="INSERT INTO t_transactions_0 (" + fields + ") VALUES (" + values + ")";
    let sql1 ="update t_transactions_index set tableIndex=?,offset=?,sysTableIndex=?,sysOffset=? where address =?";
    let params1=[data.tableIndex, data.offset,data.sysTableIndex,data.sysOffset, data.address];
    let from  = tran.fromAddress ? await Transations.prototype.getBalance(tran.fromAddress) : 0;
    let to  = tran.toAddress ? await Transations.prototype.getBalance(tran.toAddress) : 0;

        let cmds =[];
        cmds.push({sql:sql,args:params});
        cmds.push({sql:sql1,args:params1});
        let a = await sqlPromise.executeTrans(cmds);
        // await sqlPromise.promiseSqlWithParameters(sql,params);
        // await Transaction_indexModel.update(data.address, data.tableIndex, data.offset);
        let trans = {
            eHash: obj.eHash,
            id: obj.id,
            lastIdx: obj.lastIdx ? 1 : 0,
            isStable: obj.isStable ? 1 : 0,
            isValid: obj.isValid ? 1 : 0,
            hash: tran.signature,
            creation_date: updateTime,
            amount: amountInt,
            fee: feeInt,
            addressFrom: tran.fromAddress,
            addressTo: reg.test(address) ? address : tran.toAddress || '',
            result: getResultFromTran(obj),
            remark: note || '',
            amount_point: amountPoint,
            fee_point: feePoint,
            type: tran.type,
            nrgPrice: tran.nrgPrice,
            context: tran.context,
            message: obj.message,
            tokenValue: tokenValue,
            contractAddress:  reg.test(address) ? tran.toAddress:''
        }
        Redis.hset('transactions',tran.signature,JSON.stringify(trans));
        //refreshTranList(tran.signature,getResultFromTran(obj));

        if(!tran.snapVersion){
            //发送方

            if(from && trans.result == 'good' && tran.fromAddress != 'undefined'){
                let balance = new Bignumber(from).minus(new Bignumber(amount).div(new Bignumber(config.EXOValue))).minus(new Bignumber(fee).div(new Bignumber(config.EXOValue))).toFixed();
                Redis.hset('balance',tran.fromAddress,balance);
            }else if(!from && trans.result == 'good' && tran.fromAddress != 'undefined'){
                let balance = new Bignumber("0").minus(new Bignumber(amount).div(new Bignumber(config.EXOValue))).minus(new Bignumber(fee).div(new Bignumber(config.EXOValue))).toFixed();
                Redis.hset('balance',tran.fromAddress,balance);
            }
            //接收方

            if(to && trans.result == 'good' && tran.toAddress != 'undefined'){
                let balance = new Bignumber(to).plus(new Bignumber(amount).div(new Bignumber(config.EXOValue))).toFixed();
                Redis.hset('balance',tran.toAddress,balance);
            }else if(!to && trans.result == 'good' && tran.toAddress != 'undefined'){
                let balance = new Bignumber(amount).div(new Bignumber(config.EXOValue)).toFixed();
                Redis.hset('balance',tran.toAddress,balance);
            }
        }

    }catch (e) {
        console.log('insertTran: ',e);
        return e.toString()

    }
}

/**
 * 新增交易记录
 * @param tran
 * @param data
 * @returns {Promise<void>}
 */
async function insertTranToken(tran, data) {
    let decimal = tran.tokenDecimals ? tran.tokenDecimals  : 18;
    let obj = tran;
    let amount = obj.amount;
    let amountInt = amount.replace(/"/g, '').substring(-1, amount.length - decimal) ? amount.replace(/"/g, '').substring(-1, amount.length - decimal) : 0;
    let amountPoint = amount.replace(/"/g, '').substring(amount.length - decimal, amount.length) ? amount.replace(/"/g, '').substring(amount.length - decimal, amount.length) : 0;
    let NRG_PRICE = tran.nrgPrice || 0;
    let fee = (tran.fee * NRG_PRICE).toString();
    let feeInt = fee.replace(/"/g,'').substring(-1,fee.length-18) ? fee.replace(/"/g,'').substring(-1,fee.length-18) : 0;
    let feePoint = fee.replace(/"/g,'').substring(fee.length-18,fee.length) ? fee.replace(/"/g,'').substring(fee.length-18,fee.length) : 0;
    var fields = 'addressTo=?, amount=?, fee=? ,amount_point=?, fee_point=?,contractAddress=?, tokenName=?, tokenSymbol=?, tokenDecimals=?, tokenTotalsupply=?, flag=?, nrgPrice=?';
    var params = [obj.toAddress,amountInt, feeInt, amountPoint, feePoint,obj.contractAddress, obj.tokenName, obj.tokenSymbol, obj.tokenDecimals, obj.tokenTotalsupply, 1, NRG_PRICE, obj.hash];
    let sql ="update  t_transactions_0 set " +fields+" where hash=?";
    let sql1 ="update t_transactions_index set tableIndex=?,offset=? where address =?";
    let params1=[data.tableIndex, data.offset, data.address];
    try{
        let cmds =[];
        cmds.push({sql:sql,args:params})
        cmds.push({sql:sql1,args:params1})
        await sqlPromise.executeTrans(cmds);

    }catch (e) {
        console.log('insertTran: ',e);
        return e.toString()

    }
}

/**
 * 失败交易
 */
async function badTran(tran, data) {
    let id = tran.hash;
    let sql ="update t_transactions_0 set result = 'final-bad' where hash = ?";
    let params =[id];
    let sql1 ="update t_transactions_index set tableIndex=?,offset=? where address =?";
    let params1=[data.tableIndex, data.offset, data.address];
    try{
        let cmds =[];
        cmds.push({sql:sql,args:params})
        cmds.push({sql:sql1,args:params1})
        await sqlPromise.executeTrans(cmds);
        refreshTranList( id, 'final-bad')
    }catch (e) {
        console.log('updateTran: ',e.toString())
    }
}

/**
 * 通过交易的状态返回数据库中状态的值
 * @param tran
 * @returns {string}
 */
function getResultFromTran(tran) {
    if (tran.isStable && tran.isValid) {
        return 'good';
    } else if (tran.isStable && !tran.isValid) {
        return 'final-bad';
    } else if (!tran.isStable) {
        return 'pending';
    }
}




/**
 * 更新已有交易状态
 * @param tran
 * @param data
 * @returns {Promise<void>}
 */
async function updateTran(tran, data) {
    let id = tran.hash;
    let sql ="update t_transactions_0 set result = 'good' where hash = ?";
    let params =[id];
    let sql1 ="update t_transactions_index set tableIndex=?,offset=? where address =?";
    let params1=[data.tableIndex, data.offset, data.address];
    try{
        let cmds =[];
        cmds.push({sql:sql,args:params})
        cmds.push({sql:sql1,args:params1})
        await sqlPromise.executeTrans(cmds);
        refreshTranList( id, 'good')
    }catch (e) {
        console.log('updateTran: ',e.toString())
    }

}


async function getAllTransactionHistory(localfullnode, address, tableIndex, offset,sysTableIndex,sysOffset) {
    //let type = [1, 2, 3, 4];
    let resultMessage = JSON.parse(await webHelper.httpPost(getUrl(localfullnode, '/v1/getmessagelistnew'), null, buildData({ tableIndex,offset,sysTableIndex,sysOffset})));
    let result = resultMessage.data;
    if(resultMessage.code == 200) {
        result = JSON.parse(result);
        tableIndex = result.tableIndex?result.tableIndex:0;
        offset     = result.offset?result.offset:0;
        sysTableIndex     = result.sysTableIndex?result.sysTableIndex:0;
        sysOffset     = result.sysOffset?result.sysOffset:0;
        return result.list? {result:result.list,tableIndex,offset,address,sysTableIndex,sysOffset}:{result:[],tableIndex,offset,address,sysTableIndex,sysOffset};
    }else {
        return {result:[],tableIndex,offset,address,sysTableIndex,sysOffset}
    }
}

/**
 * 查询合约交易手续费
 * @param localfullnode
 * @param address
 * @param tableIndex
 * @param offset
 * @param sysTableIndex
 * @param sysOffset
 * @returns {Promise<*>}
 */
async function getReceipt(hash) {

    let localfullnode = config.EXO_URL;

    try {
        let result = JSON.parse(await webHelper.httpPost(getUrl(localfullnode, '/v1/getReceipt'), null, {hash:hash}));
        if (result.code == 200) {
            let data = JSON.parse(result.data);

            return data;
        } else {
            return null;
        }
    } catch (e) {
        console.log('getReceipt error: ', e.toString());
        return e.toString();
    }

}


/**
 * 从共识网获取交易记录
 * @param localfullnode
 * @param address
 * @param tableIndex
 * @param offset
 * @returns {Promise<*>}
 */
async function getTransactionHistory(localfullnode, address, tableIndex, offset) {
    let type = [1, 2];
    let resultMessage = JSON.parse(await webHelper.httpPost(getUrl(localfullnode, '/v1/gettransactionlist'), null, buildData({ address,tableIndex,offset, type })));
    let result = resultMessage.data;
    if(resultMessage.code == 200) {
        result = JSON.parse(result);
        tableIndex = result.tableIndex?result.tableIndex:0;
        offset     = result.offset?result.offset:0;
        return result.list? {result:result.list,tableIndex,offset,address}:{result:[],tableIndex,offset,address};
    }else {
        return {result:[],tableIndex,offset,address}
    }
}


/**
 * 获取token交易记录
 * @param address
 * @param tableIndex
 * @param offset
 * @returns {Promise<*>}
 */
async function getAllTransactionHistoryToken(address, tableIndex, offset) {
    try{
        let limit = 100;
        let obj ={
            offset: offset.toString(),
            limit: limit.toString()
        }

        let resultMessage = JSON.parse(await webHelper.httpPost(config.tokenUrl+'/dice/app/transferRecOffset', config.headers, obj));
        let result =resultMessage;
        if(resultMessage.code == 0){
            //result = JSON.parse(result);
            return {result: result.list,tableIndex:0,offset: result.offset,address: address};
        }else {
            return {result: [],tableIndex:0,offset: offset,address: address}
        }
    }catch (e) {
        console.log('getAllTransactionHistoryToken: ',e.toString())
    }


}


/**
 * 初始本地交易记录
 * @param address
 * @returns {Promise<void>}
 */
async function iniTranList() {
    let sql ="select *  from t_transactions_0 "
    //交易列表
    try{
        tranList = await sqlPromise.promiseSql(sql)
        for(let item of tranList){
            Redis.hset('transactions',item.hash,JSON.stringify(item));
        }
        //console.log(tranList)
        init = true;
    }catch (e) {
        console.log('iniTranList: ',e.toString())
    }
}

async function getPendingTransactions() {
    let sql ="select * from t_transactions_0 where result='pending'";
    //交易列表
    try{
        let list = await sqlPromise.promiseSql(sql)
        if(list.length > 0){
            return list
        }else{
            return null;
        }
    }catch (e) {
        console.log('iniTranList: ',e.toString())
        return null;
    }
}


//刷新本地交易记录列表
function refreshTranList( hash ,result) {
    Redis.get(hash,(err, res) => {
        if (!res) {
            Redis.set(hash,result)
        }
    });

}

// //初始化本地交易余额
// Transations.prototype.initBalance = async function(){
//     let sql ="select * from (select addressFrom as address from t_transactions_0 UNION select  addressTo from t_transactions_0 )a where address <>''";
//     let addresses = await  sqlPromise.promiseSql(sql);
//     //addresses.forEach(function (v) {
//     for(let i =0 ; i < addresses.length; i ++){
//             (function(a) {
//                 setTimeout(function() {
//                     let v = addresses[i];
//                     Transations.prototype.getBalance(v.address,async function (err, res) {
//                     Redis.hset('balance',v.address,res)
//                     })
//                 }, a*300);
//             })(i)
//     }
//
//     //})
// }



Transations.prototype.getTransactionList = async (opts, cb) => {
    let sql ="select *, case when result='final-bad' then 'invalid' when addressFrom=? then 'sent' else 'received' end as action,b.decimals,b.name from t_transactions_0 a left join t_token_info b on a.contractAddress = b.address where addressFrom=? or addressTo=?  order by creation_date desc LIMIT ?,?";
    try{
        let result = await sqlPromise.promiseSqlWithParameters(sql,[opts.address, opts.address, opts.address, (opts.page-1)*opts.pageSize, opts.pageSize]);
        cb(null, result)
    }catch (e) {
        cb(e.toString());
    }
}

/**
 * 根据type类型获取
 * @param opts
 * @param cb
 * @returns {Promise<void>}
 */
Transations.prototype.getAllTransactionList = async (opts, cb) => {
    let sql ="select hash from t_transactions_0 where 1=1";
    let value = [];

    if(opts.type) {
        sql +=" and type=?";
        value.push(Number(opts.type))
    }
    if(opts.offset){

        sql+=" order by creation_date LIMIT ?,?";
        value.push((Number(opts.offset)-1)*100);
        value.push(100);
    }else {
        sql+=" order by creation_date desc LIMIT ?,?";
        value.push((opts.page-1)*opts.pageSize);
        value.push(opts.pageSize);
    }

    try{
        let result = await sqlPromise.promiseSqlWithParameters(sql,value);
        if(result.length > 0){
            for(let i of result){
                i.amount = new Bignumber(i.amount).plus((new Bignumber(i.amount_point)).div(new Bignumber(config.EXOValue.toString()))).toFixed();
            }
        }
        cb(null, result)
    }catch (e) {
        console.log('getAllTransactionList',e.toString())
        cb(e.toString());
    }
}




/**
 * 获取总交易数据
 * @param opts
 * @param cb
 * @returns {Promise<void>}
 */
Transations.prototype.getAllTransactionListPage = async (opts, cb) => {
    let sql ="select count(*) as t from t_transactions_0 where 1=1";
    if(opts.type) {
        sql +=" and type="+opts.type;
    }

    try{
        let totalCount = await sqlPromise.promiseSql(sql);
        cb(null, totalCount[0].t)
    }catch (e) {
        cb(e.toString());
    }
}

/**
 * 根据hash或adress查询交易记录
 * @param opts
 * @param cb
 * @returns {Promise<void>}
 */
Transations.prototype.getHashTransaction = async (opts, cb) => {
    let sql ="select *, cast(amount_point as CHAR ) as amount_point,cast(fee_point as CHAR ) as fee_point, b.name,b.decimals from t_transactions_0 a left join t_token_info b on a.contractAddress = b. address where 1=1   AND ";
    let sql1 ="select count(*) as t from t_transactions_0 where 1=1   and";
    let limit;
    let value = [];
    let value1 = [];
    let address = false;
    Object.keys(opts).forEach(function(key){
        if(key !='page' && key !='limit' && key !='address'){
            sql +=` ${key}=?`;
            value.push(opts[key]);
        }else if(key =='address'){
            address = true;
            sql +=' addressFrom=? or addressTo=?';
            sql1 +=' addressFrom=? or addressTo=?';
            value.push(opts[key]);
            value.push(opts[key]);
            value1.push(opts[key]);
            value1.push(opts[key]);
        }else if(key =='page'){
            sql +=" order by creation_date DESC ";
            limit=" limit ?,?";
            value.push((Number(opts[key])-1)*Number(opts['limit']));
            value.push(Number(opts['limit']));
            sql += limit;
        }
    });

    let obj ={};
    let isLimit = sql.match(/limit/);
    if(!isLimit) {
        sql +=" order by creation_date DESC ";
        sql +=' limit 0,10';
    }
    try{
        let res = await sqlPromise.promiseSqlWithParameters(sql,value);

        if(!address){
            obj = res[0];
            if(obj){
                obj.amount = new Bignumber(obj.amount.toString()).plus(new Bignumber(obj.amount_point.toString()).div(new Bignumber(config.EXOValue.toString()))).toFixed();
                obj.fee = new Bignumber(obj.fee.toString()).plus((new Bignumber(obj.fee_point.toString())).div(new Bignumber(config.EXOValue.toString()))).toFixed();
            }else {
                obj = {};
                obj.amount = 0;
                obj.fee = 0;
            }
        }else {
            let res1 = await sqlPromise.promiseSqlWithParameters(sql1,value);
            obj.currPage = opts.page || 1;
            obj.pageSize = opts.limit || 10;
            obj.totalCount = res1[0].t;
            obj.totalPage = Math.ceil(res1[0].t/(opts.limit || 10));
            obj.list = formatTrans(res);
        }
        cb(null, obj)
    }catch (e) {
        cb(e.toString());
    }
}


/**
 * 根据hash或adress查询交易记录
 * @param opts
 * @param cb
 * @returns {Promise<void>}
 */
Transations.prototype.getHashTransactionToken = async (opts, cb) => {
    let sql ="select *, cast(amount_point as CHAR ) as amount_point,cast(fee_point as CHAR ) as fee_point, b.name,b.decimals from t_transactions_0 a right join t_token_info b on a.contractAddress = b.address where 1=1  and b.address is not null AND ";
    let sql1 ="select count(*) as t from t_transactions_0 a right join t_token_info b  on a.contractAddress = b.address where 1=1  and b.address is not null  and";
    let limit;
    let value = [];
    let value1 = [];
    let address = false;
    Object.keys(opts).forEach(function(key){
        if(key !='page' && key !='limit' && key !='address'){
            sql +=` ${key}=?`;
            value.push(opts[key]);
        }else if(key =='address'){
            address = true;
            sql +=' addressFrom=? or addressTo=?';
            sql1 +=' addressFrom=? or addressTo=?';
            value.push(opts[key]);
            value.push(opts[key]);
            value1.push(opts[key]);
            value1.push(opts[key]);
        }else if(key =='page'){
            sql +=" order by creation_date DESC ";
            limit=" limit ?,?";
            value.push((Number(opts[key])-1)*Number(opts['limit']));
            value.push(Number(opts['limit']));
            sql += limit;
        }
    });

    let obj ={};
    let isLimit = sql.match(/limit/);
    if(!isLimit) {
        sql +=" order by creation_date DESC ";
        sql +=' limit 0,10';
    }
    try{
        let res = await sqlPromise.promiseSqlWithParameters(sql,value);

        if(!address){
            obj = res[0];
            if(obj){
                obj.amount = new Bignumber(obj.amount.toString()).plus(new Bignumber(obj.amount_point.toString()).div(new Bignumber(config.EXOValue.toString()))).toFixed();
                obj.fee = new Bignumber(obj.fee.toString()).plus((new Bignumber(obj.fee_point.toString())).div(new Bignumber(config.EXOValue.toString()))).toFixed();
            }else {
                obj = {};
                obj.amount = 0;
                obj.fee = 0;
            }
        }else {
            let res1 = await sqlPromise.promiseSqlWithParameters(sql1,value);
            obj.currPage = opts.page || 1;
            obj.pageSize = opts.limit || 10;
            obj.totalCount = res1[0].t;
            obj.totalPage = Math.ceil(res1[0].t/(opts.limit || 10));
            obj.list = formatTrans(res);
        }
        cb(null, obj)
    }catch (e) {
        cb(e.toString());
    }
}

/**
 * 格式化金额
 * @param res
 * @returns {*}
 */
function formatTrans(res){
    for(let i of res){
        i.amount = new Bignumber(i.amount).plus((new Bignumber(i.amount_point)).div(new Bignumber(config.EXOValue.toString()))).toFixed();
        i.fee = new Bignumber(i.fee).plus((new Bignumber(i.fee_point)).div(new Bignumber(config.EXOValue.toString()))).toFixed();

    }
    //console.log(res)
    return res;
}

/**
 * 获取账户余额
 * @param address
 * @param cb
 * @returns {Promise<void>}
 */
Transations.prototype.getBalance = async  (address, cb) => {
    let balance = await common.redisHget('balance',address);
    //console.log(typeof balance)
    if(balance){
        if(cb){
            return cb(null, balance);
        }else {
            return balance;
        }

    }
    let  DECIMAL = require('../../../util/config').EXOValue;
    let sqlto="select  *,cast(amount_point as CHAR ) as amount_point,cast(fee_point as CHAR ) as fee_point,addressTo address  from t_transactions_0 where addressTo=? and contractAddress is null ";
    let sqlFrom="select  *,cast(amount_point as CHAR ) as amount_point,cast(fee_point as CHAR ) as fee_point,addressFrom address  from t_transactions_0 where addressFrom=? and contractAddress is null";
    let resTo = await sqlPromise.promiseSqlWithParameters(sqlto,[address]);
    let resFrom = await sqlPromise.promiseSqlWithParameters(sqlFrom,[address]);
    let to ={amount:0 ,amountPoint: 0}
    let from ={amount:0 ,amountPoint: 0}
    if(resTo && resTo.length > 0) {
        let amount = 0;
        let amountPoint = 0;
        resTo.forEach(function (i) {
            if(i.result == 'good' ){
                amount = new Bignumber(amount).plus(new Bignumber(i.amount)).toFixed();
                amountPoint = new Bignumber(amountPoint).plus(new Bignumber(i.amount_point)).toFixed();
            }
        });
        to.amount = amount;
        to.amountPoint = amountPoint;
    }
    if(resFrom && resFrom.length > 0) {
        let amount = 0;
        let amountPoint = 0;
        resFrom.forEach(function (i) {
            if(i.result =='good' || i.result == 'pending'){
                amount = new Bignumber(amount).plus(new Bignumber(i.amount)).plus(new Bignumber(i.fee)).toFixed();
                amountPoint = new Bignumber(amountPoint).plus(new Bignumber(i.amount_point).plus(new Bignumber(i.fee_point))).toFixed();
            }
        });
        from.amount = amount;
        from.amountPoint = amountPoint;
    }

    let stables = new Bignumber(to.amount).minus(new Bignumber(from.amount)).plus(new Bignumber(to.amountPoint).div(new Bignumber(DECIMAL))).minus(new Bignumber(from.amountPoint).div(new Bignumber(DECIMAL))).toFixed();
    Redis.hset('balance',address,stables);
    if(cb){
        return cb(null, stables)
    }else {
        return stables;
    }


}

/**
 * 查询地址余额
 * @param address
 * @param cb
 * @returns {Promise<*>}
 */
// Transations.prototype.getBalance = async (address,cb) =>{
//     if(address ==''){
//         return cb(0)
//     }
//     let pubkey ='AoulFnsMkNo1HFZHTQ1SzWwgFVlwVHF39O17FBDs8vIj';
//     let localfullnode = await common.getLocalfullnode(pubkey);
//     if(!localfullnode) return cb(`localfullnode is null`);
//     try{
//         let result = JSON.parse(await webHelper.httpPost(getUrl(localfullnode, '/v1/account/info'), null, buildData({address})));
//         //console.log(result)
//         let data = JSON.parse(result.data)
//         cb(null, data.balance ==0 ? 0 : new Bignumber(data.balance.toString()).div(new Bignumber("1000000000000000000")).toFixed());
//     }catch (e) {
//         cb(e.toString())
//     }
// }


/**
 * 获取地址信息
 * @returns {Promise<void>}
 */
Transations.prototype.getAccountMessage = async () => {
    let sql ="select count(*) as t from t_transactions_0";
    let sql1 ="select count(*) as t from (select addressFrom as address from t_transactions_0 UNION select  addressTo from t_transactions_0 )a where address <>''"
    try{
        let res = await sqlPromise.promiseSql(sql);
        let res1 = await sqlPromise.promiseSql(sql1);
        Redis.set('messageTotal',res[0].t);
        Redis.set('accountsTotal',res1[0].t);
        let a = await redis.getRedis(`message${moment().format('YYYY-MM-DD')}`);
        if(!a) {
            let res2 = await sqlPromise.promiseSqlWithParameters("select * from t_accounts_messages  where creation_date_day=? order by creation_date_day DESC ", [moment().format('YYYY-MM-DD')]);
            let obj = {
                creation_date_day: moment().format('YYYY-MM-DD'),
                messageTotal: res[0].t,
                accountsTotal: res1[0].t,
                creation_date: Math.round(Date.now())
            }
            if (res2.length > 0) {
                Redis.set(`message${moment().format('YYYY-MM-DD')}`, `${res[0].t}-${res1[0].t}`);
            } else {
                let sqlAcount = "insert into t_accounts_messages (creation_date_day,messageTotal,accountsTotal,creation_date) values (?,?,?,?)";
                await sqlPromise.promiseSqlWithParameters(sqlAcount, [obj.creation_date_day, obj.messageTotal, obj.accountsTotal, obj.creation_date])
                Redis.set(`message${moment().format('YYYY-MM-DD')}`, `${res[0].t}-${res1[0].t}`);
            }
        }
    }catch (e) {
        console.log('getAccountMessage: ',e.toString());
    }
}


/**
 * 统计地址、消息数量
 * @returns {Promise<{messageTotal: Array, accountsTotal: Array}>}
 */
Transations.prototype.selectAll = async (data) => {
    let sql ="select FROM_UNIXTIME(creation_date/1000,'%Y-%m-%d') as day ,cast(amount as CHAR ) as amount,cast(amount_point as CHAR ) as amount_point from t_transactions_0 where addressTo=? ORDER BY creation_date desc";
    let res = await sqlPromise.promiseSqlWithParameters(sql,[data.address]);
    let list =[];
    let flag = false;
    if(res && res.length >0){
        for(let i = 0; i < res.length; i++) {
            if(list.length == 0 && res[i].amount != "0"){
                delete res[i].amount_point
                list.push(res[i]);
                continue;
            }
            for(let t = 0; t < list.length; t++) {
                if(res[i].day == list[t].day){
                    list[t].amount = new Bignumber(list[t].amount).plus(new Bignumber(res[i].amount)).plus(new Bignumber(res[i].amount_point).div(new Bignumber(config.EXOValue))).toFixed();
                    flag = true;
                    break;
                }
            }
            if(!flag && res[i].amount != "0"){
                delete res[i].amount_point
                list.push(res[i]);
            }else {
                flag = false;
            }
        }

        let  subList = list.slice(((data.page-1)*data.pageSize),data.pageSize)
        let obj ={
            list: subList,
            totalCount: list.length
        }
        return obj;
    }

}

//组装访问共识网的url
let getUrl = (localfullnode, suburl) => {
    return localfullnode + suburl;
}
//组装往共识网发送数据的对象
let buildData = (data) => {
    return JSON.parse(JSON.stringify(data));
}




// Transations.prototype.testInsert  = async (tran)=> {
//     //console.log(tran)
//     let updateTime = tran.updateTime;
//     let obj = tran;
//     tran = JSON.parse(tran.message);
//      if(inArray(tran.fromAddress,addresses)) tran.fromAddress = '';
//      if(inArray(tran.toAddress ,addresses)) tran.toAddress = '';
//     let amount = obj.amount ? obj.amount : tran.amount;
//     if(!amount) {
//         amount ="0";
//         tran.fee = "0";
//     }
//     let amountInt = amount.replace(/"/g, '').substring(-1, amount.length - 18) ? amount.replace(/"/g, '').substring(-1, amount.length - 18) : 0;
//     let amountPoint = amount.replace(/"/g, '').substring(amount.length - 18, amount.length) ? amount.replace(/"/g, '').substring(amount.length - 18, amount.length) : 0;
//     let NRG_PRICE = tran.nrgPrice || 0;
//     let fee = (tran.fee * NRG_PRICE).toString();
//     let feeInt = fee.replace(/"/g,'').substring(-1,fee.length-18) ? fee.replace(/"/g,'').substring(-1,fee.length-18) : 0;
//     let feePoint = fee.replace(/"/g,'').substring(fee.length-18,fee.length) ? fee.replace(/"/g,'').substring(fee.length-18,fee.length) : 0;
//
//     let Base64 = require('../../../util/base64Code');
//     let note = tran.remark ? Base64.decode(tran.remark) : '';
//     var fields = "hash, creation_date, amount, fee, addressFrom, addressTo, result, remark, amount_point, fee_point, type, nrgPrice,context,message, eHash, id, lastIdx, isStable, isValid";
//     var values = "?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?";
//     var params = [tran.signature, updateTime, amountInt || 0, feeInt || 0, tran.fromAddress, tran.toAddress || '', getResultFromTran(obj), note || '', amountPoint || 0, feePoint || 0,tran.type, tran.nrgPrice || 0, tran.context, obj.message, obj.eHash, obj.id, obj.lastIdx ? 1 : 0, obj.isStable ? 1 : 0, obj.isValid ? 1 : 0];
//     if(tran.snapVersion){
//         fields += " ,snapVersion";
//         values +=",?";
//         params.push(tran.snapVersion)
//     }
//     let sql ="INSERT INTO t_transactions_0 (" + fields + ") VALUES (" + values + ")";
//     try{
//        sqlPromise.sqlExecuteWithParameters(sql,params);
//
//     }catch (e) {
//         console.log('insertTran: ',e);
//         return e.toString()
//
//     }
// }


module.exports = Transations;


