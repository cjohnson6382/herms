var http = require('http');
http.createServer(function (request, response) {
	console.log(request);
	response.end('helow worlde');
	console.log('request received and responded to');
}).listen(8080, function () {
	console.log('Started!');
});
