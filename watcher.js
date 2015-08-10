var Etcd = require('node-etcd'),
    exec = require('child_process').exec,
    config = require('./config');

var etcd = new Etcd();

var api = {
    watch: function (key) {
        etcd.set(config.etcd.key1, config.mongod1, function set() {
            exec(config.mongod1, function (err, stdout, stderr) {
                setTimeout(set, 10);
            });
        });
    }
}

module.exports = api;
