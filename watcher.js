var Etcd = require('node-etcd'),
    exec = require('child_process').exec,
    config = require('./config');

var etcd = new Etcd();
var watcher = etcd.watcher(config.etcd.master.key);

var watch = {
	del: function (config, cb) {
		var watcher = etcd.watcher(config.key);

		watcher.on('delete', function (data) {
			console.log("delete : " + data);
			exec(config.mongod, cb);
		});		
	}
}

module.exports = watch;