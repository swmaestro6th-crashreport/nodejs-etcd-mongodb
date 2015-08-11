var Etcd = require('node-etcd'),
    exec = require('child_process').exec,
    sys = require('sys'),
    config = require('./config');

var etcd = new Etcd();

var api = {
    watch: function (key) {
      etcd.get(config.etcd.key1, function(err, value) {
          etcd.set(config.etcd.key1, config.mongod1, function set() {
              exec(config.mongod1, function (err, stdout, stderr) {
                setTimeout(set, 1);
              })
          })
      })
    }
}

module.exports = api;
