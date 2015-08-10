var api = require('./watcher'),
    config = require('./config');

console.log('wathcer start');
api.watch(config.etcd.key1);
