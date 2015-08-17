var api = require('./connect'),
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