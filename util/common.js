"use strict";
const config = require('./config')
const webHelper = require("./webhelper.js");
const _ = require('lodash');
const Bignumber = require('bignumber.js');

let urlList = [];

async function getLocalfullnode(pubkey) {
    //console.log(urlList)
    try {
        if (urlList.length == 0) {
            let result = JSON.parse(await webHelper.httpPost(config.my_device_hashnetseed_url + '/v1/getlocalfullnodes', null, {pubkey: pubkey}));
            if (result.code != 200) {
                console.log(`getLocalfullnode err: ${result.data}`);
                return;
            } else {
                if (result.data == '') {
                    console.log(`getLocalfullnode is null`);
                    return;
                    null
                } else {
                    let localfullnodes = JSON.parse(result.data);
                    _.forEach(localfullnodes, function (res) {
                        urlList.push(`${res.ip}:${res.httpPort}`)
                    });
                }
            }
        }
        let localfullnode = urlList[Math.ceil(Math.random() * urlList.length - 1)].replace("172.17.2.119:35", "localfullnode01.ginvip.com:36");
        return localfullnode;
    } catch (e) {
        console.log('catch getLocalfullnode: localfullnode is null ', e.toString());
        return null;
    }

}


function getRedis(k) {
    return new Promise((resolve, reject) => {
        Redis.get(k, (err, res) => {
            if (err) reject(err)
            resolve(res);
        });
    });
}

function dbsizeRedis() {
    return new Promise((resolve, reject) => {
        Redis.dbsize((err, res) => {
            if (err) reject(err)
            resolve(res);
        });
    });
}

function redisHget(h, k) {
    return new Promise((resolve, reject) => {
        Redis.hget(h, k, (err, res) => {
            if (err) reject(null)
            if(res ==null || res =='NaN'){
                resolve(null)
            }else {
                resolve(JSON.parse(res))
            }

        })
    })
}

/**
 * 字符串转base64
 * @param data
 * @returns {string}
 */
let stringToBase64 =(data) =>{
    return new Buffer(data).toString("base64")
}

/**
 * 数字转base64
 * @param data
 * @returns {*}
 */
let numberToBase64 =(data) =>{
    let n = new Bignumber(data);
    let k = n.toNumber().toString(16);
    k = k.length % 2 ==1 ? "0"+k : k;
    return Buffer.from(k,'hex').toString("base64")
}

/**
 * base转字符串
 * @param data
 */
let base64ToString =(data) => {
    return  Buffer.from(data,"base64").toString();

}

/**
 * base64转数字
 * @param data
 */
let base64ToNumber =(data) => {
    let b = Buffer.from(data, "base64").toString("hex");
    return new Bignumber(parseInt(b, 16)).minus('0').toFixed();
}


exports.getLocalfullnode = getLocalfullnode;
exports.getRedis = getRedis;
exports.dbsizeRedis = dbsizeRedis;
exports.redisHget = redisHget;
exports.urlList = urlList;
exports.stringToBase64 = stringToBase64;
exports.numberToBase64 = numberToBase64;
exports.base64ToString = base64ToString;
exports.base64ToNumber = base64ToNumber;