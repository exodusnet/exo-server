const webHelper = require("./webhelper.js");
const config = require("./config.js");
const type = 'application/json';
const utils = require('./utils.js');
const BigNumber = require('bignumber.js');


/**
 * 申请合约
 * opts 字段:
 * --------------------
 * name  名字
 * symbol  符号
 * decimals  小数位
 * totalSupply token数量
 * address  用户地址
 * --------------------
 */

async function contractBaseArgs(opts,cb) {
    webHelper.httpPost(config.contract_url+'/app/contractBaseArgs',config.headers,opts,function (err, res) {
        if(err) return cb(err);
        cb(null, res);
    }, type)
}
/**
 * 合约申请列表
 * @param opts
 * @param cb
 */
function list(opts,cb){
    webHelper.httpPost(config.contract_url+'/app/list',config.headers,opts,function (err, res) {
        if(err) return cb(err);
        cb(null, res);
    }, type)
}

/**
* @description:
* 查询我添加的合约列表
 * 参数：
 *    page
 *    limit
 *    address
*
*/
function addList(opts,cb){
    webHelper.httpPost(config.contract_url+'/app/tokenadd/list',config.headers,opts,function (err, res) {
        if(err) return cb(err);
        cb(null, res);
    }, type)
}


/**
* @description:
* 查询合约信息
 * 参数：
 *    contractAddress
*
*/
async function addInformation(opts,cb){
    let res = JSON.parse( await webHelper.httpPost(config.contract_url+'/app/tokenadd/addInformation',config.headers,opts,null, type))
    if(res.code == 0){
        if(cb) return cb(null,res.data)
        else return res.data;
    }else {
        if(cb) return cb(res.data)
        else return null;
    }
}


/**
 * 拿取callData
 * @param id
 * @param cb
 */
async function publishContract(id,cb) {
    let obj ={
        id: id
    }
    webHelper.httpPost(config.contract_url+'/app/publishContract',config.headers,obj,function (err, res) {
        if(err) return cb(err);
        cb(null, res);
    }, type)
}

/**
 * 回调接口，传hash给
 * opts:
 * id: 申请列表id
 * hash: 签名hash
 */

async function hashToContract(opts,cb) {
    let obj = {
        id: opts.id,
        hash:opts.hash
    }
    webHelper.httpPost(config.contract_url+'/app/hashToContract',config.headers,obj,function (err, res) {
        if(err) return cb(err);
        cb(null, res);
    }, type)
}


/**
 * 查询合约
 * @param id
 * @param cb
 */
// function tokenInformation(opts,cb) {
//     let obj ={
//         address: opts.address,
//         contractAddress: opts.contractAddress,
//         gasLimit: opts.gasLimit,
//         gasPrice: opts.gasPrice,
//         functionName: opts.functionName
//     }
//     webHelper.httpPost(config.contract_url+'/app/tokenInformation',config.headers,obj,function (err, res) {
//         if(err) return cb(err);
//         cb(null, res);
//     }, type)
// }

/**
 * 查询合约
 * @param id
 * @param cb
 */
async function getReceipt(hash,cb) {
    let localfullnode = config.EXO_URL
    let obj = {
        hash: hash
    }
    webHelper.httpPost(localfullnode + '/v1/getReceipt', null, obj, function (err, res) {
        if (err) return cb(err);
        cb(null, res);
    }, type)
}


/**
 * 查询代币余额
 * @param id
 * @param cb
 */
// async function getBalance(opts,cb) {
//     let obj ={
//         address: opts.address,
//         contractAddress: opts.contractAddress,
//         gasLimit: opts.gasLimit,
//         gasPrice: opts.gasPrice,
//     }
//     webHelper.httpPost(config.contract_url+'/app/balanceOf',config.headers,obj,function (err, res) {
//         if(err) return cb(err);
//         cb(null, res);
//     }, type)
// }


/**
 * 查询代币余额
 * 参数：
 *    address   需要查询余额的地址(自己的地址)
 *    contract  代币合约地址
 * @param id
 * @param cb
 */
async function getBalance(opts,cb) {
    let decimal = opts.decimal ? parseInt(opts.decimal)+1 : 1;
    let h ='70a08231';
    let obj ={
        calldata: h+utils.stringToHex(opts.address),
        address: opts.contract
    }
    let localfullnode = config.EXO_URL;
    let res = JSON.parse(await webHelper.httpPost(localfullnode+'/v1/sendViewMessage',null,obj))
    if(res.code == 200 ) {
        let balance = JSON.parse(res.data).result;
        balance = balance ? new BigNumber(parseInt(balance,16)).toFixed() : '0';
        let amount = new BigNumber(balance).div(new BigNumber('1'+Array(decimal).join('0'))).toFixed();
        if (cb) return cb(null,amount);
        else return amount;
    }else {
        if(cb) cb(res);
        else return res;
    }

}


/**
 * 发送交易
 * @param id
 * @param cb
 */
// async function transfer(opts,cb) {
//     let obj = {
//         address: opts.address,
//         ContractAddress: opts.contractAddress,
//         gasLimit: opts.gasLimit,
//         gasPrice: opts.gasPrice,
//         ToAddress: opts.toAddress,
//         Value: opts.value
//     }
//     webHelper.httpPost(config.contract_url + '/app/transfer', config.headers, obj, function (err, res) {
//         if (err) return cb(err);
//         cb(null, res);
//     }, type)
// }

/**
 * 查询合约执行结果
 * @param id
 * @param cb
 */
async function hashResult(opts,cb) {
    let obj = {
        hash: opts.hash,
        type: opts.type
    }
    webHelper.httpPost(config.contract_url + '/app/hashResult', config.headers, obj, function (err, res) {
        if (err) return cb(err);
        cb(null, res);
    }, type)
}


// async function contractTransactionData(opts,cb) {
//     let Bitcore = require('bitcore-lib');
//     let NRG_PRICE = await getNrgPrice();
//     if (!NRG_PRICE) return cb(('error,unable to get nrgPrice'), null);
//
//     let amount = (opts.amount + "").split('.')[0];
//     let amountP = (opts.amount + "").split('.')[1] ? (opts.amount + "").split('.')[1] : '';
//
//     let amountstr = (amount+amountP).replace(/\b(0+)/gi,"")+zero.substring(-1,zero.length-amountP.length);
//
//     try{
//         let info = await hashnethelper.getAccountInfo(opts.fromAddress);
//         let nonce = info.nonce;
//         let callData = opts.callData;
//         let gasPrice = NRG_PRICE;
//         let value = amountstr;
//         let gasLimit = config.BASE_NRG;
//         let toAddress = opts.toAddress;
//
//         let data ={
//             nonce: nonce.toString(),
//             callData: callData,
//             gasPrice: gasPrice.toString(),
//             value: value.toString(),
//             gasLimit: gasLimit.toString(),
//             toAddress: toAddress.toString()
//         }
//         data = utils.stringToBase64(JSON.stringify(data));
//         let obj = {
//             fromAddress: opts.fromAddress,
//             timestamp: Math.round(Date.now()),
//             data: data,
//             vers: config.transationVersion,
//             pubkey: opts.pubkey,
//             type: 2
//         }
//         var xPrivKey = new Bitcore.HDPrivateKey.fromString(opts.xprivKey);
//         let buf_to_sign = objectHash.getUnitHashToSign(obj);
//         let pathSign = "m/44'/0'/0'/0/0";
//         let privKeyBuf = xPrivKey.derive(pathSign).privateKey.bn.toBuffer({size: 32});
//         let signature = ecdsaSig.sign(buf_to_sign, privKeyBuf);
//         obj.signature = signature;
//         cb(null, obj);
//     } catch (e) {
//         cb(e.toString());
//     }
// }



/**
 *
 * @param hexCharCodeStr
 * @returns {string}
 */
function hexCharCodeToStr(hexCharCodeStr) {
    var trimedStr = hexCharCodeStr.trim();
    var rawStr = trimedStr.substr(0, 2).toLowerCase() === "0x" ? trimedStr.substr(2) : trimedStr;
    var len = rawStr.length;
    if (len % 2 !== 0) {
        alert("存在非法字符!");
        return "";
    }
    var curCharCode;
    var resultStr = [];
    for (var i = 0; i < len; i = i + 2) {
        curCharCode = parseInt(rawStr.substr(i, 2), 16);
        resultStr.push(String.fromCharCode(curCharCode));
    }
    return resultStr.join("");
}



module.exports = {
    list: list,
    publishContract: publishContract,
   // tokenInformation: tokenInformation,
    hexCharCodeToStr: hexCharCodeToStr,
    getReceipt: getReceipt,
    getBalance: getBalance,
    hashResult: hashResult,
    contractBaseArgs: contractBaseArgs,
    hashToContract: hashToContract,
    addList: addList,
    addInformation: addInformation
}
