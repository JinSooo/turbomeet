# Web

## TODO

- [ ] 目前客户端音视频连接的方式是直接创建两个Producer一直用，但这会一直存在在服务器中，占用空间资源，所以有时间的话，修改一下，根据要求来适配Producer
- [x] 更新一下文档，更新学习内容

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

## mediasoup的存储

之前重构了一次存储架构，之前的修修补补太难受了，所以重新修改了一下

分为两个部分：

- 全局存储
  存储 `producers` 和 `consumers`的实例
- zustand
  存储 `me`, `peers`, `producers`, `consumers`
  这里的`producers`, `consumers`只存储一些相关信息，不是实例
  `me`, `peers`分别表示本机和所有对端用户
