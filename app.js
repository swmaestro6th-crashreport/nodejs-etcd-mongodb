var api = require('./connect'),
	watch = require('./watcher');
	Etcd = require('node-etcd'),
    config = require('./config');

console.log('wathcer start');

var etcd = new Etcd();

api.connect(etcd, config.etcd.master, function () {
	api.notify(etcd, config.etcd.master, function () {
		api.setup(etcd, config.etcd.master)
	})
});

api.connect(etcd, config.etcd.slave, function () {
	api.notify(etcd, config.etcd.slave, function () {
		api.setup(etcd, config.etcd.slave)
	});
});

watch.del(config.etcd.master, function () {
	console.log('etcd -> reloaded mongodb server port : 20000')
});

watch.del(config.etcd.slave, function () {
	console.log('etcd -> reloaded mongodb server port : 30000')
})