const tokenUtil = require('./src/utils/token');

async function test() {
    try {
        const userId = 'user-123';
        const token = await tokenUtil.createAccessToken(userId, { role: 'admin' });
        console.log('Token created:', token);

        const decoded = await tokenUtil.verifyAccessToken(token);
        console.log('Token verified:', decoded);

        if (decoded.user_id === userId && decoded.role === 'admin') {
            console.log('SUCCESS: Token data is correct');
        } else {
            console.log('FAILURE: Token data mismatch');
        }

        const ttl = await tokenUtil.getTokenRemainingTTL(token);
        console.log('TTL:', ttl);

    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
