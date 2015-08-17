var Etcd = require('node-etcd'),
    exec = require('child_process').exec,
    config = require('./config');

var etcd = new Etcd();

console.log('Etcd : Watcher started');

var watcher = {};
watcher.machine1 = etcd.watcher(config.etcd.replSet1.key);
watcher.machine2 = etcd.watcher(config.etcd.replSet2.key);
watcher.machine3 = etcd.watcher(config.etcd.replSet3.key);

watcher.machine1.on('delete', function set (data) {
	console.log("delete : " + data);
	exec(config.etcd.replSet1.mongod, function (err, stdout, stderr) {
		console.log('etcd -> reloaded mongodb server port : 20000')
		setTimeout(set, 1);
	});
});		

watcher.machine2.on('delete', function set (data) {
	console.log("delete : " + data);
	exec(config.etcd.replSet2.mongod, function (err, stdout, stderr) {
		console.log('etcd -> reloaded mongodb server port : 30000')
		setTimeout(set, 1);
	});
});	

watcher.machine3.on('delete', function set (data) {
	console.log("delete : " + data);
	exec(config.etcd.replSet3.mongod, function (err, stdout, stderr) {
		console.log('etcd -> reloaded mongodb server port : 40000')
		setTimeout(set, 1);
	});
});	