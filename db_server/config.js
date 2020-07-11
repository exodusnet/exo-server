exports.redis = {
    host: '127.0.0.1',
    port: '6379',
    password: '',
    db:0
};


exports.mysql_master = {
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: 'root',
    //database: '118',//测试环境数据
    //database: '117',
    database:'exodus_server',//主网数据
    connectionLimit: 10000,
    multipleStatements: true
};
