import { createClient } from 'redis';

export const redisClient = createClient({
    username: 'default',
    password: 'JLTYbPZXM5FeTKVyfsFQC7MuqFtyfJmd',
    socket: {
        host: 'redis-17001.c114.us-east-1-4.ec2.cloud.redislabs.com',
        port: 17001
    }
});

redisClient.on('error', err => console.log('Redis Client Error', err));

await redisClient.connect();

// await client.set('foo', 'bar');
// const result = await client.get('foo');
// console.log(result);  // >>> bar
