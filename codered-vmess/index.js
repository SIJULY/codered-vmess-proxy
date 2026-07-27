const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');

// 获取云端分配的端口 (如果平台没有分配 PORT，尝试常见的 3000 端口)
const port = process.env.PORT || process.env.port || 3000;
console.log('[系统] 环境变量信息:', JSON.stringify(process.env));

// 我们让 Xray 核心在本地一个隐藏的端口上运行
const xrayPort = 10000; 

const uuid = '884931a7-0245-42df-a337-4d43685e13d1';
const wsPath = '/vmess';

const config = {
  log: { loglevel: "info" },
  inbounds: [{
    listen: "127.0.0.1",       // Xray 核心现在只监听本地，不直接对外
    port: xrayPort,
    protocol: "vmess",
    settings: {
      clients: [{ id: uuid, alterId: 0 }]
    },
    streamSettings: {
      network: "ws",
      wsSettings: { path: wsPath }
    }
  }],
  outbounds: [{ protocol: "freedom" }]
};

// 写入配置文件
fs.writeFileSync('config.json', JSON.stringify(config));

// 启动 Xray 核心
const xray = spawn('./xray', ['-config', 'config.json']);
xray.stdout.on('data', (data) => console.log(data.toString().trim()));
xray.stderr.on('data', (data) => console.error(data.toString().trim()));
xray.on('close', (code) => console.log(`[系统] 内核已退出，代码: ${code}`));

// 创建 Node.js HTTP 代理服务器
const server = http.createServer((req, res) => {
  console.log(`[系统] 收到普通 HTTP 请求: ${req.method} ${req.url}`);
  console.log(`[系统] 请求头: ${JSON.stringify(req.headers)}`);
  
  if (req.url === '/') {
    // 返回 200 OK，应付各大云平台的健康检查
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Welcome to the web service. Running healthy.\n');
  } else if (req.url.startsWith(wsPath)) {
    // 有些网关不支持标准的 Upgrade，强制当作普通的 HTTP 转发
    // 我们尝试直接建立一个双向 Socket
    console.log('[系统] 尝试在普通 HTTP 请求中建立隧道...');
    const xraySocket = net.connect(xrayPort, '127.0.0.1', () => {
      let proxyReq = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
      let hasConnection = false;
      let hasUpgrade = false;
      
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        const headerName = req.rawHeaders[i];
        const headerValue = req.rawHeaders[i + 1];
        if (headerName.toLowerCase() === 'connection') hasConnection = true;
        if (headerName.toLowerCase() === 'upgrade') hasUpgrade = true;
        proxyReq += `${headerName}: ${headerValue}\r\n`;
      }
      
      // 如果网关剥离了 Upgrade 头，我们强行给 Xray 补上，骗过 Xray 的 WS 握手检查
      if (!hasConnection) proxyReq += `Connection: Upgrade\r\n`;
      if (!hasUpgrade) proxyReq += `Upgrade: websocket\r\n`;
      
      // Xray WS 握手还需要 Sec-WebSocket-Key，如果没有也补个假的
      if (!req.headers['sec-websocket-key']) {
        proxyReq += `Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==\r\n`;
      }
      if (!req.headers['sec-websocket-version']) {
        proxyReq += `Sec-WebSocket-Version: 13\r\n`;
      }
      
      proxyReq += '\r\n';
      xraySocket.write(proxyReq);
      
      req.socket.pipe(xraySocket);
      xraySocket.pipe(req.socket);
    });
    
    xraySocket.on('error', (err) => {
      console.error('[系统] HTTP 透传到 Xray 核心失败:', err.message);
      res.writeHead(500);
      res.end('Internal Server Error\n');
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});

// 处理 WebSocket 升级请求，进行 TCP 流量转发
server.on('upgrade', (req, socket, head) => {
  console.log(`[系统] 收到 WebSocket 升级请求，URL: ${req.url}`);
  
  // 使用 startsWith 兼容带有查询参数的路径 (例如 /vmess?ed=2048)
  if (req.url.startsWith(wsPath)) {
    const xraySocket = net.connect(xrayPort, '127.0.0.1', () => {
      // 构造 HTTP 升级请求头，透传给后端的 Xray 核心
      let proxyReq = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        proxyReq += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
      }
      proxyReq += '\r\n';
      
      xraySocket.write(proxyReq);
      xraySocket.write(head);
      
      // 双向管道数据转发（流量透传）
      xraySocket.pipe(socket);
      socket.pipe(xraySocket);
    });
    
    xraySocket.on('error', (err) => {
      console.error('[系统] 转发到 Xray 核心失败:', err.message);
      socket.end();
    });
    
    socket.on('error', (err) => {
      console.error('[系统] 客户端 Socket 错误:', err.message);
      xraySocket.end();
    });
  } else {
    console.log(`[系统] 未知的 WebSocket 路径被拒绝: ${req.url}`);
    socket.end();
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[系统] Web 服务正在监听分配端口: ${port}，Xray 核心隐藏在端口: ${xrayPort}`);
});