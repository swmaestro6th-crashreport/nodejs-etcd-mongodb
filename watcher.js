var Etcd = require('node-etcd'),
	api = require('./connect'),
    exec = require('child_process').exec,
    config = require('./config');

var etcd = new Etcd();

console.log('Etcd : Watcher started');

var watcher = {};
watcher.machine1 = etcd.watcher(config.etcd.replSet1.key);
watcher.machine2 = etcd.watcher(config.etcd.replSet2.key);
watcher.machine3 = etcd.watcher(config.etcd.replSet3.key);
watcher.master = etcd.watcher(config.master.key);

watcher.machine1.on('change', function (data) {
	console.log('etcd -> reloaded mongodb server port : 20000')
	exec(config.etcd.replSet1.mongod, function (err, stdout, stderr) {
		console.log('etcd -> reloaded mongodb server port : 20000')
		api.setup(etcd, config.etcd.replSet1)
	});
});		

watcher.machine2.on('change', function (data) {
	console.log('etcd -> reloaded mongodb server port : 30000')
	exec(config.etcd.replSet2.mongod, function (err, stdout, stderr) {
		console.log('etcd -> reloaded mongodb server port : 30000')
		api.setup(etcd, config.etcd.replSet2)
	});
});	

watcher.machine3.on('change', function (data) {
	console.log('etcd -> reloaded mongodb server port : 40000')
	exec(config.etcd.replSet3.mongod, function (err, stdout, stderr) {
		console.log('etcd -> reloaded mongodb server port : 40000')
		api.setup(etcd, config.etcd.replSet3)
	});
});

