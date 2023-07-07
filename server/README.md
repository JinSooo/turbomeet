# Server

## 配置 HTTPS

mkcert 是一个用于生成本地自签名 SSL 证书的开源工具，项目基于 Golang 开发，可跨平台使用，不需要配置，支持多域名以及自动信任 CA。

安装 [mkcert](https://github.com/FiloSottile/mkcert) [https://github.com/FiloSottile/mkcert]

接着执行如下指令生成 HTTPS 证书

```bash
./mkcert.exe localhost 127.0.0.1 ::1
```

其中 localhost+2.pem 为 公钥， localhost+2-key.pem 为私钥

在 Fastify 中使用 HTTPS 证书

```javascript
const fastify = Fastify({
	// https证书
	https: {
		cert: readFileSync(join(__dirname, '../lib/localhost+2.pem')),
		key: readFileSync(join(__dirname, '../lib/localhost+2-key.pem')),
	},
})
```

这样就配置完成了，后面服务器就会使用 https 服务了