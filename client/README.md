# Web

## 配置 HTTPS

通过 local-ssl-proxy 启用 HTTPS 访问

要将 mkcert 程序生成的公钥和私钥拷贝一份，进行使用

指令如下

```bash
# target 当前web端启用服务的端口
# source 将HTTPS访问映射到source端口
npx local-ssl-proxy --key localhost-key.pem --cert localhost.pem --source 3001 --target 3000
```

将其包装到`package.json`中

```json
{
	// ...
	"scripts": {
		"dev": "next dev",
		"https": "npx local-ssl-proxy --key localhost-key.pem --cert localhost.pem --source 3001 --target 3000"
	}
	// ...
}
```

接着使用下面指令运行即可启用 HTTPS 访问

```bash
pnpm dev
pnpm https
```