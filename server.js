const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
  res.end('hello from myapp v2\n');
});

server.listen(3000, () => {
  console.log('server started on 3000');
});
