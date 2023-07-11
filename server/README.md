# Server

## TODO

- [ ] 设置房间最大人数
- [ ] 修改rooms对象存储的Router实例对象，改为routerId，减小体积

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

## Mediasoup 媒体存储架构

看着很多，其实很简单，一共分为两大类，

- 一类是worker上的公共Media存储，用于快速获取每一个指定的Media数据
- 一类是内部数据的私有Media存储，用于知晓如一个router对应的transport有多少个

```typescript
// @ts-ignore
mediasoup.observer.on('newworker', (worker: Worker<WorkerAppData>) => {
 worker.appData.routers = new Map()
 worker.appData.transports = new Map()
 worker.appData.producers = new Map()
 worker.appData.consumers = new Map()

 // @ts-ignore
 worker.observer.on('newrouter', (router: Router<RouterAppData>) => {
  router.appData.worker = worker
  router.appData.transports = new Map()
  router.appData.producers = new Map()
  router.appData.consumers = new Map()
  worker.appData.routers.set(router.id, router)

  router.observer.on('close', () => {
   worker.appData.routers.delete(router.id)
  })
  // @ts-ignore
  router.observer.on('newtransport', (transport: Transport<TransportAppData>) => {
   transport.appData.router = router
   transport.appData.producers = new Map()
   transport.appData.consumers = new Map()
   router.appData.transports.set(transport.id, transport)
   worker.appData.transports.set(transport.id, transport)

   transport.observer.on('close', () => {
    router.appData.transports.delete(transport.id)
    worker.appData.transports.delete(transport.id)
   })
   // @ts-ignore
   transport.observer.on('newproducer', (producer: Producer<ProducerAppData>) => {
    producer.appData.transport = transport
    transport.appData.producers.set(producer.id, producer)
    router.appData.producers.set(producer.id, producer)
    worker.appData.producers.set(producer.id, producer)

    producer.observer.on('close', () => {
     transport.appData.producers.delete(producer.id)
     router.appData.producers.delete(producer.id)
     worker.appData.producers.delete(producer.id)
    })
   })
   // @ts-ignore
   transport.observer.on('newconsumer', (consumer: Consumer<ConsumerAppData>) => {
    console.log('new consumer', consumer.id)
    consumer.appData.transport = transport
    transport.appData.consumers.set(consumer.id, consumer)
    router.appData.consumers.set(consumer.id, consumer)
    worker.appData.consumers.set(consumer.id, consumer)

    consumer.observer.on('close', () => {
     console.log('close consumer', consumer.id)
     transport.appData.consumers.delete(consumer.id)
     router.appData.consumers.delete(consumer.id)
     worker.appData.consumers.delete(consumer.id)
    })
   })
  })
 })
})
```

## 引用存储的三大对象
>
> mediasoup内部的appData进行实例存储

- socket
  一个socket对应一个房间，即一个Router，并且也是代表一个用户，
  所以存储 `routerId`, `roomId`, `peerId`
- rooms
  和上面一样，代表一个Router，（ps: 目前存储的是实例，我也不知道我这么想的，有空修改一下），同时一个房间还有多个用户，
  所以存储 `roomId`, `peers`, `router`
- peers
  用于真正的音视频通信，所以包括producer和consumer，所以存储 `peerId`, `roomId`, `producers`, `consumers`
