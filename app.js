var api = require('./connect'),
	Etcd = require('node-etcd'),
    config = require('./config');

console.log('Etcd : Server started');

var etcd = new Etcd();

api.connect(etcd, config.etcd.replSet1, function () {
	api.notify(etcd, config.etcd.replSet1, function (err, data) {
	})
});

api.connect(etcd, config.etcd.replSet2, function () {
	api.notify(etcd, config.etcd.replSet2, function (err, data) {
	});
});

api.connect(etcd, config.etcd.replSet3, function () {
	api.notify(etcd, config.etcd.replSet3, function (err, data) {
	});
});