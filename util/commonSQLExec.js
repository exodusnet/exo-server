const Mysql = require('../db_server/mysql');
var async = require("async");
//#region SQL封装
/**
 * SQL执行语句（不带动态占位符）
 * @param {String} queryString
 */
exports.sqlExecute = function (queryString, callBack) {
  if (!queryString || typeof queryString !== "string" || (queryString = queryString.trim()).length === 0) {
    const emptyError = new Error(`queryString不能为空！`);
    callBack(emptyError, null);
  }
  else {
    Mysql.master.query(queryString, (err, results) => {
      if (err) {
        callBack(err, null);
      }
      else {
        callBack(null, results);
      }
    });
  }
};

/**
 * promise化
 * @param {string} sql 
 */
exports.promiseSql = (sql) => {
  return new Promise((resolve, reject) => {
    this.sqlExecute(sql, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    })
  })
}
/**
 * promise化 （带动态占位符）
 * @param {string} sql 
 */
exports.promiseSqlWithParameters = (sql, values) => {
  return new Promise((resolve, reject) => {
    this.sqlExecuteWithParameters(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    })
  })
}

/**
 * SQL执行语句（带动态占位符）
 * @param {String} queryString 
 */
exports.sqlExecuteWithParameters = function (queryString, preparedValues, callBack) {

  if (!queryString || typeof queryString !== "string" || (queryString = queryString.trim()).length === 0) {
    callBack(new Error(`queryString不能为空！`), null);
  }
  else {
    const preparedSql =
      {
        sql: queryString,
        values: preparedValues
      };

    Mysql.master.query(preparedSql, (err, results) => {
      if (err) {
        callBack(err, null);
      }
      else {
        callBack(null, results);
      }
    });
  }
};


/**
 * 事务处理
 * @param cmds
 * @returns {Promise<void>}
 */
// exports.executeTrans = function(cmds) {
//     return new Promise((resolve, reject) => {
//         Mysql.master.getConnection(function (err, connection) {
//             if (err) reject(err);
//             //console.log('connection: ',connection)
//             connection.beginTransaction(function (err) {
//                 if (err) {
//                     console.log(err);
//                     reject(err);
//                 }
//                 try {
//                     for (var i = 0; i < cmds.length; i++) {
//                         // console.log(cmds[i].sql)
//                         //console.log(cmds[i].args)
//                         require('./commonSQLExec').sqlExecuteWithParameters(cmds[i].sql, cmds[i].args, function () {});
//                     }
//                     connection.commit(function (err) {
//                         if (err) {
//                             console.log(err);
//                             reject(err);
//                         }
//                         //console.log('成功,提交!');
//                         //释放资源
//                         connection.release();
//                         resolve('');
//                     });
//                 } catch (e) {
//                     console.log('错误',e.toString())
//                     connection.rollback(function () {
//                         //console.log('出现错误,回滚!');
//                         //释放资源
//                         connection.release();
//                     });
//                     reject(e.toString());
//                 }finally {
//                     connection.release();
//                 }
//             });
//         });
//     });
// }



exports.executeTrans = function(sqlparamsEntities) {
    return new Promise((resolve, reject) => {
        Mysql.master.getConnection(function (err, connection) {
            if (err) {
                reject(err);
            }
            connection.beginTransaction(function (err) {
                if (err) {
                    reject(err);
                }
                //console.log("开始执行transaction，共执行" + sqlparamsEntities.length + "条数据");
                var funcAry = [];
                sqlparamsEntities.forEach(function (sql_param) {
                    var temp = function (cb) {
                        var sql = sql_param.sql;
                        var param = sql_param.args;
                        connection.query(sql, param, function (tErr, rows, fields) {
                            if (tErr) {
                                connection.rollback(function () {
                                    console.log("事务失败，" + JSON.stringify(sql_param) + "，ERROR：" + tErr);
                                    //throw tErr;
                                    connection.release();
                                });
                            } else {
                                return cb(null, rows);
                            }
                        })
                    };
                    funcAry.push(temp);
                });

                async.series(funcAry, function (err, result) {
                    if (err) {
                        connection.rollback(function (err) {
                            console.log("transaction error: " + err);
                            connection.release();
                            reject(err);
                        });
                    } else {
                        connection.commit(function (err, info) {
                            //console.log("transaction info: " + JSON.stringify(info));
                            if (err) {
                                console.log("执行事务失败，" + err);
                                connection.rollback(function (err) {
                                    console.log("transaction error: " + err);
                                    connection.release();
                                    reject(err);
                                });
                            } else {
                                connection.release();
                                resolve(info);
                            }
                        })
                    }
                })
            });
        });
    })
}

//#endregion