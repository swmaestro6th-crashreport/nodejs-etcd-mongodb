var Etcd = require('node-etcd'),
    exec = require('child_process').exec;

var api = {
    setup: function (etcd, config, cb) {
      etcd.get(config.key, { recursive: true }, function (err, value) {
        etcd.set(config.key, config.mongod, cb);
      });
    },

    connect: function (etcd, config, cb) {
      etcd.get(config.key, { recursive: true }, function (err, value) {
          etcd.set(config.key, config.mongod, function() {
              exec(config.mongod, cb);
          });
      });
    },

    notify: function (etcd, config, cb) {
      etcd.get(config.key, { recursive: true }, function (err, value) {
        etcd.set(config.key, '', cb);
      });
    }
}

module.exports = api;
