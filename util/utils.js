'use strict';

var BigNumber = require('bignumber.js');


/**
 * 字符串转base64
 * @param data
 * @returns {string}
 */
let stringToBase64 = (data) => {
    return new Buffer(data).toString("base64")
}

let stringTo16 = (data) => {
    return new Buffer(data, 'base64').toString('hex');
}

let stringToHex = (data) => {
    var val="";
    for(var i = 0; i < data.length; i++){
        if(val == "")
            val = data.charCodeAt(i).toString(16);
        else
            val += "" + data.charCodeAt(i).toString(16);
    }
    return val;

}

/**
 * 数字转base64
 * @param data
 * @returns {*}
 */
let numberToBase64 = (data) => {
    let k = numberTo16(data);
    k = k.length % 2 == 1 ? "0" + k : k;
   return Buffer.from(k, 'hex').toString("base64")
}

/**
 * 数字转16进制
 * @param data
 * @returns {string}
 */
let numberTo16 = (data) => {
    let n = new BigNumber(data);
    return n.toNumber().toString(16);

}

/**
 * 自动补位
 * @param num
 * @param length
 * @returns {string}
 * @constructor
 */
function PrefixInteger(num, length) {
    return (Array(length).join('0') + num).slice(-length);
}


/**
 * base转字符串
 * @param data
 */
let base64ToString = (data) => {
    return Buffer.from(data, "base64").toString();

}

/**
 * base64转数字
 * @param data
 */
let base64ToNumber = (data) => {
    let b = Buffer.from(data, "base64").toString("hex");
    return new BigNumber(parseInt(b, 16)).sub('0').toFixed();
}

let Hexstring2btye = (str)=> {
    let pos = 0;
    let len = str.length;
    if (len % 2 != 0) {
        return null;
    }
    len /= 2;
    let hexA = new Array();
    for (let i = 0; i < len; i++) {
        let s = str.substr(pos, 2);
        let v = parseInt(s, 16);
        hexA.push(v);
        pos += 2;
    }
    return hexA;
}


module.exports = {
    stringToBase64: stringToBase64,
    numberToBase64: numberToBase64,
    base64ToString: base64ToString,
    base64ToNumber: base64ToNumber,
    Hexstring2btye: Hexstring2btye,
    stringTo16:stringTo16,
    numberTo16: numberTo16,
    PrefixInteger: PrefixInteger,
    stringToHex: stringToHex
};