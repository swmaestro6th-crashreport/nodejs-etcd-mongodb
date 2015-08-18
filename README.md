#Auto-Reovery System Server-Side with etcd and Node.js and MongoDB

## Introduction

서비스의 서버는 High Availability를 유지해야 한다. 설령 Down이 된다고 하더라도 빠른 시간 안에 복구할 수 있어야한다. 

이 글에서는 etcd 를 통해 MongoDB 서버가 죽었을 때 다시 되살려주는 **Watcher Instance**를 개발한다. 이를 통하여 서버 Downtime을 최소화 하는 것이 목적이다.

## Why etcd?
Apache ZooKeeper로 서버를 구축하여 **Watcher Instance**를 개발할 수 있지만 더 간단한 구조이면서도 좋은 성능을 가진 etcd를 이용해본다. 잘 정리된 자료가 없다. 
	
## etcd?

etcd는 Consistent한 Key-Value 저장소이다.

* Simple : Curl을 이용하여 API를 테스트할 수 있다. **(HTTP + JSON)**
* Secure : SSL을 지원한다.
* Fast : 하나의 Instance 당 1000s의 쓰기 연산을 할 수 있다.
* Reliable : Raft라는 알고리즘이 사용되고 있다.

etcd는 **Go 언어**로 작성되어졌다. **Brew**로 설치할 수 있으나 소스 코드를 **Build**하고 사용하려면 Go 언어를 설치해야한다.

* TIP : MongoDB처럼 JSON Document를 저장하기 위해서는 JSON을 String으로 변환해야한다. Node.js에서는 JSON.Stringify를 이용하면 된다.

## Requirement

	1. etcd
	2. Node.js
	3. MongoDB (Option)

## Basic usage of etcd

etcd를 사용하기 위해서, 우리는 Key로 Service를 표현해야하며 Value는 JSON 문서 형식으로 Service에 필요한 유용한 정보들을 표현할 수 있다. 예를 들면, Hostname, Port, Pid(Process Id), createdNodeIndex 등이 존재한다.

이를 위해서, etcd에서는 etcdctl를 지원한다.

	$ etcdctl set /services/db "{\"hostname\": \"127.0.0.1\", \"port\": 3000}"
	{"hostname": "127.0.0.1", "port": 3000}
	
	$ etcdctl ls /services
	/services/server
	
	$ etcdctl get /services/db
	{"hostname": "127.0.0.1", "port": 3000}
	

## Use etcdctl, Node.js and MongoDB for Auto-Reovery System

이제 Node.js로 코드를 작성해야한다. Node.js에서 etcd를 사용하기 위해서는 [node-etcd](https://github.com/stianeikeland/node-etcd)를 사용하면 된다.

node-etcd의 set을 이용하여 Key를 생성할 수 있다. 
	
	$ index.js
	
	var Etcd = require('node-etcd');    
	var etcd = new Etcd();
	
	etcd.set(key, JSON.stringify({ hostname: 	'127.0.0.1', port: '3000', pid: process.pid}), 
		function () {});
		
위와 같이 코드를 작성해보면 서버를 실행시켜본다.

	$ node index
	
	{ action: 'set',
  		node: 
  			{ key: 'key',
     		  value: '{"hostname":"127.0.0.1","port":"3000","pid":2174}',
     		  modifiedIndex: 40,
     		  createdIndex: 40 }
    }
    
성공적으로 생성된 것을 볼 수 있다. 이제 생성된 Key에 해당하는 Value를 찾아보자. 매우 간단하다.

	$ index.js
	
	etcd.get(key, function (err, value)) {
		console.log(value);
	}

Key에 해당하는 Value가 출력된다. 

	$ node index
	
	{ action: 'get',
  		node: 
  			{ key: 'key',
     		  value: '{"hostname":"127.0.0.1","port":"3000","pid":2174}',
     		  modifiedIndex: 40,
     		  createdIndex: 40 }
    }

이제 본격적으로 MongoDB 서버가 Down되었을 때 다시 살려주는 **Watcher Instance**를 개발해보자. 일단 config.json을 생성하여 설정들을 분리시켜준다.

	$ config.json
	
	{
  		"etcd" : {
    		"replSet1" : {
      			"key" : "/services/db1",
      			"mongod" : "mongod --port 20000 --dbpath /data/db/replSet1 --replSet Mongo_study"
    		}, 
    		"replSet2" :  {
      			"key" : "/services/db2",
      			"mongod" : "mongod --port 30000 --dbpath /data/db/replSet2 --replSet Mongo_study"
    		},
    		"replSet3" :  {
      			"key" : "/services/db3",
      			"mongod" : "mongod --port 40000 --dbpath /data/db/replSet3 --replSet Mongo_study"
    		}
	  }
	}
	
위의 코드는 Mongod의 설정 코드들이다. 이제 etcd 서버를 초기화하는 코드를 작성해보자.

	$ connect.js
	
	var Etcd = require('node-etcd'),
    	exec = require('child_process').exec;

	var api = {

    	setup: function (etcd, config, cb) {
      		etcd.get(config.key, function (err, value) {
        		etcd.set(config.key, config.mongod, cb);
      		});
    	},

    	connect: function (etcd, config, cb) {
      		etcd.get(config.key, function (err, value) {
          		etcd.set(config.key, config.mongod, function() {
              		exec(config.mongod, cb);
          		});
      		});
    	},

    	notify: function (etcd, config, cb) {
      		etcd.get(config.key, function (err, value) {
        		etcd.del(config.key, cb);
      		});
    	}
	}

	module.exports = api;

위의 코드는 **setup**, **connect**, **notify**, 3개의 함수로 이루어져있다.

1. connect -> 서버에 Key를 조회하고서 결과에 따라 새로운 Key:Value를 생성한다.
2. notify -> MongoDB 서버가 Down된 것을 감지한 후, etcd에 있던 설정을 바꾸는 역할을 한다. 이것을 통해 Watcher Instance에서는 MongoDB가 Down된 것을 알아차리고 서버를 재가동한다.
3. setup -> MongoDB 서버를 재가동한 후, 새로운 서버 설정을 etcd에 생성한다.


이제 watcher.js 코드를 작성해본다. 

	$ watcher.js
	
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
	
Watcher가 감시할 Key를 **'watcher.machine1 = etcd.watcher(config.etcd.replSet1.key);'**와 같은 방식으로 초기화해놓는다. (config.etcd.replSet1.key는 config.json에 정의되어있다.) 그 후에 watcher.on()을 이용하여 서버가 Down되면 재가동하는 코드를 넣는다.

	
**sudo node app**으로 etcd 서버를 실행시킨 후에, **sudo node watcher.js**를 통하여 **Watcher Instance**를 실행한다.

	$ ps aux | grep mongod
	
	root [process_id] 0.5 0.8 2735688 35568 s002 S+ 11:30PM 0:01.93 mongod --port 20000 --dbpath /data/db/replSet1 --replSet Mongo_study
	root [process_id] 0.5 0.8 2735688 35568 s002 S+ 11:30PM 0:01.93 mongod --port 30000 --dbpath /data/db/replSet1 --replSet Mongo_study
	root [process_id] 0.5 0.8 2735688 35568 s002 S+ 11:30PM 0:01.93 mongod --port 40000 --dbpath /data/db/replSet1 --replSet Mongo_study
	
정상적으로 MongoDB 서버가 작동 중인 것을 확인할 수 있다. 이제 강제적으로 프로세스를 Down 시켜본 후, MongoDB 서버가 복구되는 것을 확인해보자.

	$ sudo kill -9 [process_id]
	
	$ ps aux | grep mongod
	
	root [process_id] 0.5 0.8 2735688 35568 s002 S+ 11:30PM 0:01.93 mongod --port 20000 --dbpath /data/db/replSet1 --replSet Mongo_study
	root [process_id] 0.5 0.8 2735688 35568 s002 S+ 11:30PM 0:01.93 mongod --port 30000 --dbpath /data/db/replSet1 --replSet Mongo_study
	root [process_id] 0.5 0.8 2735688 35568 s002 S+ 11:30PM 0:01.93 mongod --port 40000 --dbpath /data/db/replSet1 --replSet Mongo_study
	
**위의 과정을 통하여 MongoDB 서버가 다시 정상적으로 복구되는 모습을 확인할 수 있다.** 이러한 자동화 시스템을 구축하지않는다면 개발자는 밤에 일어나서 수동적으로 복구를 해야한다.

##Result

Apache ZooKeeper와 CoreOS etcd 사이에서 무엇이 더 나은지 가늠하기가 어려운 것같다. 나라면 더 많은 문서와 예제가 있는 Apache ZooKeeper를 선택할 것같다.

**etcd를 공부한 내용을 기록한 것입니다. 혹시 틀린 점이 있다면 과감히 말씀해주세요. 다시 고치도록 하겠습니다.**
