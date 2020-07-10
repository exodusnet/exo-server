"use strict";

/**
 * .
 */
const util = require('util');

const baseModel = require('./baseModel');
const sqlPromise = require('../../../util/commonSQLExec');

/*用户基本类型*/
function Addresses() {
    this.table = 'addresses';
    baseModel.call(this);
    this.primary_key = 'id';
    this.insert_require = ['address', 'create_date', 'remark'];
    this.rules = ['address'];
}
util.inherits(Addresses, baseModel);


/**
 * 查询所有地址信息
 * @returns {Promise<string>}
 */
Addresses.prototype.select = async () => {
    let sql ='SELECT address from t_addresses';
    try{
        let result =  await  sqlPromise.promiseSql(sql);
        return result;
    }catch (e) {
        return e.toString();
    }

}


module.exports = Addresses;


