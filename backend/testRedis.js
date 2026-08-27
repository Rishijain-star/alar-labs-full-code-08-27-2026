// testRedis.js
const redis = require('redis');

async function testRedis() {
    console.log('Testing Redis connection...');

    try {
        const client = redis.createClient({
            socket: {
                host: 'localhost',
                port: 6379
            }
        });

        client.on('error', (err) => console.error('Redis Error:', err));

        await client.connect();
        console.log('✅ Connected to Redis');

        // Test PING
        const pong = await client.ping();
        console.log(`✅ PING response: ${pong}`);

        // Test SET
        await client.set('test:key', 'test_value');
        console.log('✅ SET test:key = test_value');

        // Test GET
        const value = await client.get('test:key');
        console.log(`✅ GET test:key = ${value}`);

        // Test creating a role
        const roleData = {
            id: 'test_role',
            name: 'Test Role',
            description: 'Testing',
            isActive: true,
            createdAt: Date.now()
        };

        await client.set('role:test_role', JSON.stringify(roleData));
        console.log('✅ Created test role');

        const role = await client.get('role:test_role');
        console.log('✅ Retrieved role:', JSON.parse(role));

        // Add to set
        await client.sAdd('roles:list', 'test_role');
        console.log('✅ Added to roles:list');

        const members = await client.sMembers('roles:list');
        console.log('✅ Roles list:', members);

        await client.disconnect();
        console.log('✅ All tests passed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testRedis();