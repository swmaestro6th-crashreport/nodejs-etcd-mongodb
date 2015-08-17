var Etcd = require('node-etcd'),
    exec = require('child_process').exec,
    config = require('./config');

var etcd = new Etcd();

var watcher = {};
watcher.machine1 = etcd.watcher(config.etcd.master.key);
watcher.machine2 = etcd.watcher(config.etcd.slave.key);

watcher.machine1.on('delete', function set (data) {
	console.log("delete : " + data);
	exec(config.etcd.master.mongod, function (err, stdout, stderr) {
		console.log('etcd -> reloaded mongodb server port : 20000')
		setTimeout(set, 1);
	});
});		

watcher.machine2.on('delete', function set (data) {
	console.log("delete : " + data);
	exec(config.etcd.slave.mongod, function (err, stdout, stderr) {
		console.log('etcd -> reloaded mongodb server port : 30000')
		setTimeout(set, 1);
	});
});	