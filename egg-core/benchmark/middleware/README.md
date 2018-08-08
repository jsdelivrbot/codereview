
**Please run benchmark with node 7+ for async await support.**

## Benchmark Result

```sh
v8.9.0
server started at 7001
------- generator middleware -------
["generator middleware #1","generator middleware #2","generator middleware #3","generator middleware #4","generator middleware #5","generator middleware #6","generator middleware #7","generator middleware #8","generator middleware #9","generator middleware #10","generator middleware #11","generator middleware #12","generator middleware #13","generator middleware #14","generator middleware #15","generator middleware #16","generator middleware #17","generator middleware #18","generator middleware #19","generator middleware #20"]
Running 10s test @ http://127.0.0.1:7001/generator
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     7.35ms    1.76ms  26.71ms   89.82%
    Req/Sec   835.10     90.14     1.00k    77.15%
  64366 requests in 10.00s, 47.37MB read
Requests/sec:   6436.48
Transfer/sec:      4.74MB
------- async middleware -------
["async middleware #1","async middleware #2","async middleware #3","async middleware #4","async middleware #5","async middleware #6","async middleware #7","async middleware #8","async middleware #9","async middleware #10","async middleware #11","async middleware #12","async middleware #13","async middleware #14","async middleware #15","async middleware #16","async middleware #17","async middleware #18","async middleware #19","async middleware #20"]
Running 10s test @ http://127.0.0.1:7001/async
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     5.35ms    1.27ms  20.44ms   92.48%
    Req/Sec     1.18k   157.98     1.57k    75.69%
  90415 requests in 10.00s, 60.08MB read
Requests/sec:   9040.45
Transfer/sec:      6.01MB
```

![](https://user-images.githubusercontent.com/985607/32474444-2f4b7cde-c332-11e7-923f-8dfb709a7a24.png)
