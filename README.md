#Automatic Server-Side with etcd and Node.js and MongoDB

## Introduction

서비스의 서버는 High Avality를 유지해야 한다.설령 Down이 된다고 하더라도 빠른 시간 안에 복구할 수 있어야한다. 

이 글에서는 etcd 를 통해 MongoDB 서버가 죽었을 때 다시 되살려주는 **Watcher Instance**를 개발한다. 이를 통하여 서버 Downtime을 최소화 하는 것이 목적이다.

## Why etcd?
Apache ZooKeeper로 서버를 구축하여 **Watcher Instance**를 개발할 수 있지만 더 간단한 구조이면서도 좋은 성능을 가진 etcd를 이용해본다. 잘 정리된 자료가 없다. 
	
## etcd?

etcd는 Consistent한 Key-Value 저장소이다.

* Simple : Curl을 이용하여 API를 테스트할 수 있다. **(HTTP + JSON)**
* Secure : SSL을 지원한다.
* Fast : 하나의 Instance 당 1000s의 쓰기 연산을 할 수 있다.
* Reliable : Raft라는 알고리즘이 사용되고 있다.

etcd는 **Go 언어**로 작성되어졌다. **Brew**로 설치할 수 있으나닌 소스 코드를 **Build**하고 사용하려면 Go 언어를 설치해야한다.

* TIP : MongoDB처럼 JSON Document를 저장하기 위해서는 JSON을 String으로 변환해야한다. Node.js에서는 JSON.Stringify를 이용하면 된다.

## Requirement

	1. etcd
	2. Node.js
	3. MongoDB (Option)

## Use etcdctl, Node.js for Automatic Server-Side

etcd를 사용하기 위해서, 우리는 Key로 Service를 표현해야하며 Value는 JSON 문서 형식으로 Service에 필요한 유용한 정보들을 표현할 수 있다. 예를 들면, Hostname, Port, Pid(Process Id), createdNodeIndex 등이 존재한다.

이를 위해서, etcd에서는 etcdctl를 지원한다.

	$ etcdctl set /services/db "{\"hostname\": \"127.0.0.1\", \"port\": 3000}"
	{"hostname": "127.0.0.1", "port": 3000}
	
	$ etcdctl ls /services
	/services/server
	
	$ etcdctl get /services/server
	{"hostname": "127.0.0.1", "port": 3000}
	

이제 Node.js로 코드를 작성해야한다. Node.js에서 etcd를 사용하기 위해서는 [node-etcd](https://github.com/stianeikeland/node-etcd)를 사용하면 된다.

node-etcd의 set을 이용하여 Key를 생성할 수 있다. 
	
	var Etcd = require('node-etcd');    
	var etcd = new Etcd();
	
	etcd.set(key, JSON.stringify({ hostname: 	'127.0.0.1', port: '3000', pid: process.pid}), 
		function () {});
		
	Options에 { wait : true }를 하면 etcdctl을 이용하여
	watcher를 실행할 수 있다.
		
위와 같이 코드를 작성해보면 서버를 실행시켜본다.

	$ node index
	
	{ action: 'set',
  		node: 
  			{ key: '/services/db',
     		  value: '{"hostname":"127.0.0.1","port":"3000","pid":2174}',
     		  modifiedIndex: 40,
     		  createdIndex: 40 }
    }
    
성공적으로 생성된 것을 볼 수 있다. 이제 생성된 Key에 해당하는 Value를 찾아보자. 매우 간단하다.

	$ node index
	
	etcd.get(key, function (err, value)) {
		console.log(value);
	}

Key에 해당하는 Value가 출력된다. 이제 따로 config에 설정들을 분리시켜주자. 

	config.json
	
	"mongod" : "mongod --port 20000 --dbpath /data/db/rs1--replSet master

따로 Watcher.js를 생성하여 서버 상태를 봐주는 코드를 작성해보도록 하자.

	var Etcd = require('node-etcd'),
    	exec = require('child_process').exec,
    	config = require('./config');

	var etcd = new Etcd();

	var api = {
    	watch: function (key) {
        	etcd.set(config.etcd.key1, config.mongod1, function set() {
            	exec(config.mongod1, function (err, stdout, stderr) {
                	setTimeout(set, 10);
            	});
        	});
    	}
	}

	module.exports = api;

해당 코드는 app.js에서 실행할 것이기 때문에 module.exports를 잊지 않는다.

	var api = require('./watcher'),
		config = require('config');
		
	console.log('watcher start');
	api.watch(config.etcd.key1);

**sudo node app**으로 서버를 실행시킨다. 그 후에 **ps aux | grep mongod**를 실행하여 mongod 프로세스를 확인해보자.

	$ ps aux | grep mongod
	
	root 17150 0.5 0.8 2735688 35568 s002 S+ 11:30PM 0:01.93 mongod --port 20000 --dbpath /data/db/replSet1 --replSet db
	
정상적으로 MongoDB 서버가 작동 중인 것을 확인할 수 있다. 이제 강제적으로 프로세스를 Down 시켜본 후, MongoDB 서버가 복구되는 것을 확인해보자.

	$ sudo kill -9 [process_id]
	
	$ ps aux | grep mongod
	
	root 17892 0.7 1.2 2726472 50880 s002 S+ 11:41PM 0:00.10 mongod --port 20000 --dbpath /data/db/replSet1 --replSet db
	
**위의 과정을 통하여 MongoDB 서버가 다시 정상적으로 복구되는 모습을 확인할 수 있다.** 이러한 자동화 시스템을 구축하지않는다면 개발자는 밤에 일어나서 수동적으로 복구를 해야한다.

여러 서버를 복구하기 위해서는 따로 클러스터를 구성하도록 한다.

**etcd를 공부한 내용을 기록한 것입니다. 혹시 틀린 점이 있다면 과감히 말씀해주세요. 다시 고치도록 하겠습니다.**
