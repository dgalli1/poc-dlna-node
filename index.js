var Server = require('node-ssdp').Server,
    server = new Server();

const axios = require('axios');
const parseXML = require('xml2js').parseString;
const MediaRendererClient = require('upnp-mediarenderer-client');
hostList = [];

var fs = require('fs'),
http = require('http');

http.createServer(function (req, res) {
    fs.readFile(__dirname + req.url, function (err,data) {
      if (err) {
        res.writeHead(404);
        res.end(JSON.stringify(err));
        return;
      }
      res.writeHead(200);
      res.end(data);
    });
  }).listen(8080);

  
server.addUSN('upnp:rootdevice');
server.addUSN('urn:schemas-upnp-org:device:MediaServer:1');
server.addUSN('urn:schemas-upnp-org:service:ContentDirectory:1');
server.addUSN('urn:schemas-upnp-org:service:ConnectionManager:1');

server.on('advertise-alive', function (headers) {
    console.log(headers.LOCATION)
    hostList.forEach(host => {
        if (host.location === headers.LOCATION) {
            return;
        }
    });

    axios
        .get(headers.LOCATION)
        .then(function (response) {
            parseXML(response.data, function (err, result) {
                hostList.forEach(host => {
                    if (host.location === headers.LOCATION) {
                        return;
                    }
                });
                hostList.push({
                    'location': headers.LOCATION,
                    'name': result.root.device.friendlyName,
                    'uuid': result.root.device.UDN,
                    'raw': result
                });
            });
        })
        .catch(function (error) {});
});

server.on('advertise-bye', function (headers) {
    console.log('advertise-bye', headers);

});

// start the server
server.start();

//wait for enter keypress
process.stdin.on('data', function (key) {
    //get first element in hostlist
    server.stop();
    var host = hostList[0];
    console.log(hostList);
    var client = new MediaRendererClient(host.location);
    var options = {
        autoplay: true,
        contentType: 'audio/mp4',
        metadata: {
            title: 'Some Movie Title',
            creator: 'John Doe',
            type: 'audio', // can be 'video', 'audio' or 'image'
        }
    };
    client.load('http://192.168.178.26:8080/test.m4a', options, function (err, result) {
        if (err) throw err;
        console.log('playing ...');
    });

});

process.on('exit', function () {
    console.log()
    server.stop() // advertise shutting down and stop listening
})