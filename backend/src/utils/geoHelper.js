const geoip = require('geoip-lite');

/**
 * Extract real IP from request
 */
const getClientIP = (req) => {
    return (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip
    );
};

/**
 * Get location data from IP using geoip-lite (Offline, No API)
 */
const getLocationFromIP = (ip) => {
    try {
        // Skip localhost
        if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168')) {
            console.warn('⚠️  Local IP detected — skipping geo lookup');
            return {};
        }

        // Handle IPv6 mapped IPv4 (e.g. ::ffff:192.168.1.1)
        const cleanIP = ip.includes('::ffff:') ? ip.split('::ffff:')[1] : ip;

        const geo = geoip.lookup(cleanIP);

        if (!geo) {
            console.warn(`⚠️  No geo data found for IP: ${cleanIP}`);
            return {};
        }

        return {
            country: geo.country || null,   // "IN"
            state: geo.region || null,   // "MH"
            city: geo.city || null,   // "Mumbai"
            pincode: geo.zip || null,   // May be empty (geoip-lite limitation)
            timezone: geo.timezone || null,   // "Asia/Kolkata"
            ll: geo.ll || null,   // [lat, lon]
        };
    } catch (error) {
        console.error('❌ Geo lookup failed:', error.message);
        return {};
    }
};

module.exports = { getLocationFromIP, getClientIP };