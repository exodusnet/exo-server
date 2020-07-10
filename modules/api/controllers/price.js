"use strict";
const webHelper = require('../../../util/webhelper');
const config = require('../../../util/config')

/**
 * 首次创建钱包注册地址或直接从共识网拉取所有地址记录
 * @param req
 * @param res
 * @param next
 */
exports.nrg = async (req, res, next) =>{
    let url = config.my_device_hashnetseed_url;
    try {
        let result = JSON.parse(await webHelper.httpPost(url + '/v1/price/nrg', null, {}));
        if (result.code == 200) {
            let nrgPrice = JSON.parse(result.data).nrgPrice;
            res.success({nrgPrice:nrgPrice});
        } else {
            res.success({nrgPrice:"1000000000"});
        }
    } catch (e) {
        console.log("nrg error: ",e.toString());
        res.success({nrgPrice:"1000000000"})
    }
}
