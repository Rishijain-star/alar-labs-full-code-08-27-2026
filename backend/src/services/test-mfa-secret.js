#!/usr/bin/env node

/**
 * 🧪 MFA SECRET TESTER
 * 
 * This script tests if your secret generates the correct codes
 * 
 * Usage:
 *   node test-mfa-secret.js
 * 
 * Then enter your secret and code when prompted
 */

const speakeasy = require('speakeasy');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function testMFA() {
    console.log('\n🧪 MFA SECRET TESTER\n');
    console.log('='.repeat(60));
    
    // Get secret from user
    const secret = await question('\n🔑 Enter your MFA secret (e.g., JZJUMRKDNB2G6K): ');
    
    if (!secret || secret.length < 10) {
        console.log('❌ Invalid secret. Must be at least 10 characters.');
        rl.close();
        return;
    }
    
    // Get code from user
    const userCode = await question('📱 Enter the code from your authenticator app: ');
    
    const cleanCode = String(userCode).trim().replace(/\s/g, '');
    
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
        console.log(`❌ Invalid code format: ${cleanCode}`);
        rl.close();
        return;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n🔍 TEST RESULTS:\n');
    
    // Generate current expected token
    const currentTime = Math.floor(Date.now() / 1000);
    const expectedToken = speakeasy.totp({
        secret: secret.trim(),
        encoding: 'base32',
    });
    
    console.log(`🔑 Expected token (RIGHT NOW): ${expectedToken}`);
    console.log(`📱 Your code:                  ${cleanCode}`);
    console.log(`⏰ Server time:                ${new Date().toISOString()}`);
    console.log(`🕐 Unix timestamp:             ${currentTime}`);
    
    if (expectedToken === cleanCode) {
        console.log('\n✅ ✅ ✅ PERFECT MATCH! ✅ ✅ ✅');
        console.log('Your authenticator app and server are perfectly synchronized!\n');
        rl.close();
        return;
    }
    
    console.log('\n❌ No match with current token. Checking time windows...\n');
    
    // Check adjacent time windows
    console.log('📋 Valid tokens in nearby time windows:\n');
    
    for (let offset = -2; offset <= 2; offset++) {
        const testTime = currentTime + (offset * 30);
        const token = speakeasy.totp({
            secret: secret.trim(),
            encoding: 'base32',
            time: testTime
        });
        
        const timeDate = new Date(testTime * 1000).toISOString();
        const label = offset === 0 ? '← CURRENT' : 
                     offset === -1 ? '(30s ago)' :
                     offset === 1 ? '(30s ahead)' :
                     offset < 0 ? `(${Math.abs(offset * 30)}s ago)` :
                     `(${offset * 30}s ahead)`;
        
        const match = token === cleanCode ? ' ✅ MATCH HERE!' : '';
        console.log(`   ${token} ${label.padEnd(15)} ${timeDate}${match}`);
    }
    
    // Check wider range
    console.log('\n🔍 Checking wider time range (±10 minutes)...\n');
    
    let foundMatch = false;
    
    for (let offset = -20; offset <= 20; offset++) {
        const testTime = currentTime + (offset * 30);
        const token = speakeasy.totp({
            secret: secret.trim(),
            encoding: 'base32',
            time: testTime
        });
        
        if (token === cleanCode) {
            foundMatch = true;
            const minutesOff = (offset * 30) / 60;
            const timeDate = new Date(testTime * 1000);
            
            console.log('✅ MATCH FOUND!\n');
            console.log(`   Token:        ${token}`);
            console.log(`   Time offset:  ${minutesOff > 0 ? '+' : ''}${minutesOff.toFixed(1)} minutes`);
            console.log(`   Server time:  ${new Date().toISOString()}`);
            console.log(`   Code's time:  ${timeDate.toISOString()}`);
            console.log(`   Direction:    ${minutesOff > 0 ? 'Phone is AHEAD of server' : 'Phone is BEHIND server'}`);
            
            console.log('\n💡 SOLUTION:\n');
            
            if (Math.abs(minutesOff) > 2) {
                console.log('   Your phone and server times are out of sync!');
                console.log('\n   Fix your PHONE:');
                console.log('   1. Settings → Date & Time');
                console.log('   2. Enable "Set Automatically"');
                console.log('   3. Restart phone');
                console.log('   4. Try again');
                console.log('\n   Or fix your SERVER:');
                console.log('   1. Run: sudo ntpdate -s time.nist.gov');
                console.log('   2. Or: sudo timedatectl set-ntp true');
            } else {
                console.log('   Minor time drift detected.');
                console.log('   Increase the window parameter to 10 in your code.');
            }
            
            break;
        }
    }
    
    if (!foundMatch) {
        console.log('❌ NO MATCH FOUND in ±10 minute window\n');
        console.log('🔍 POSSIBLE ISSUES:\n');
        console.log('   1. ❌ Wrong secret key (QR code mismatch)');
        console.log('   2. ❌ Extreme time drift (>10 minutes)');
        console.log('   3. ❌ Wrong authenticator app or account');
        console.log('\n💡 SOLUTION:\n');
        console.log('   1. Delete MFA from your authenticator app');
        console.log('   2. Generate a new secret in your application');
        console.log('   3. Scan the NEW QR code');
        console.log('   4. Try again');
        console.log('\n   Make sure you\'re using the secret: ' + secret.trim());
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test with window verification
    const verified = speakeasy.totp.verify({
        secret: secret.trim(),
        encoding: 'base32',
        token: cleanCode,
        window: 10,
    });
    
    console.log('🧪 Verification with window=10:');
    console.log(`   Result: ${verified ? '✅ PASS' : '❌ FAIL'}`);
    
    if (verified) {
        console.log('\n✅ Good news! Your code would verify with window=10');
        console.log('   Update your verifySetup method to use window: 10\n');
    }
    
    rl.close();
}

// Run the test
testMFA().catch(err => {
    console.error('Error:', err);
    rl.close();
});