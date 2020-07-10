"use strict";

/**
 * .
 */
const util = require('util');
const baseModel = require('./baseModel');
const sqlPromise = require('../../../util/commonSQLExec');

/*用户基本类型*/
function TokenIfno() {
    this.table = 'token_info';
    baseModel.call(this);
    this.primary_key = 'address';
    this.insert_require = ['address', 'symbol', 'totalSupply','decimals','name'];
    this.rules = ['address'];
}
util.inherits(TokenIfno, baseModel);


/**
 * 查询所有地址信息
 * @returns {Promise<string>}
 */
TokenIfno.prototype.select = async (address) => {
    let sql ='SELECT address from t_token_info where address=?';
    try{
        let result =  await  sqlPromise.promiseSqlWithParameters(sql,[address]);
        if(result.length > 0){
            return result;
        }else {
            return [];
        }

    }catch (e) {
        console.log('tokenInfoSelect error : ',e.toString());
        return [];
    }

}


module.exports = TokenIfno;


