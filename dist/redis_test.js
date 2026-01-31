import { createClient } from 'redis';
import { config } from "./config.js";
export const redisClient = createClient({
    username: 'default',
    password: config.Redis_Password,
    socket: {
        host: config.Redis_Host,
        port: config.Redis_Port
    }
});
redisClient.on('error', err => console.log('Redis Client Error', err));
await redisClient.connect();
// await client.set('foo', 'bar');
// const result = await client.get('foo');
// console.log(result);  // >>> bar
//# sourceMappingURL=redis_test.js.map