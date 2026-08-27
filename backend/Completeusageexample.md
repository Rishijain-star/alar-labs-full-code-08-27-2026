/**
 * Complete Usage Example
 * Shows how to use models, repository, and auth service together
 */

require('dotenv').config();
const db = require('./models');
const UserRepository = require('./repositories/userRepository');
const AuthService = require('./services/authService');
const logger = require('./lib/logger');

// Example usage class
class AuthSystemExample {
    constructor() {
        this.userRepo = new UserRepository();
        
        // Initialize auth service with repository
        AuthService.setUserRepository(this.userRepo);
        this.authService = new AuthService();
    }

    /**
     * Example 1: Complete Registration Flow
     */
    async exampleRegistration() {
        console.log('\n=== REGISTRATION FLOW ===\n');

        try {
            // Step 1: Register user
            const registerResult = await this.authService.register({
                email: 'john.doe@example.com',
                phone: '+1234567890',
                password: 'SecurePass123!',
                full_name: 'John Doe',
                verification_type: 'email'
            });

            console.log('✓ Registration initiated');
            console.log('  OTP Token:', registerResult.otpToken);
            console.log('  Expires in:', registerResult.expiresIn, 'seconds');

            // Step 2: Verify OTP (in real app, user enters OTP)
            const otpCode = '123456'; // This would come from email/SMS
            const verifyResult = await this.authService.verifyRegistrationOtp(
                registerResult.otpToken,
                otpCode
            );

            console.log('✓ Registration verified');
            console.log('  User ID:', verifyResult.userId);
            console.log('  Message:', verifyResult.message);

            return verifyResult.userId;
        } catch (error) {
            console.error('✗ Registration failed:', error.message);
            throw error;
        }
    }

    /**
     * Example 2: Complete Login Flow
     */
    async exampleLogin(email, password) {
        console.log('\n=== LOGIN FLOW ===\n');

        try {
            const loginResult = await this.authService.login({
                email,
                password,
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                deviceInfo: {
                    browser: 'Chrome',
                    os: 'Windows',
                    device: 'Desktop'
                },
                rememberMe: false
            });

            // Case 1: MFA Required
            if (loginResult.requiresMfa) {
                console.log('⚠ MFA verification required');
                console.log('  MFA Token:', loginResult.mfaToken);
                return { requiresMfa: true, ...loginResult };
            }

            // Case 2: Device Verification Required
            if (loginResult.requiresDeviceVerification) {
                console.log('⚠ Device verification required');
                console.log('  OTP Token:', loginResult.otpToken);
                return { requiresDeviceVerification: true, ...loginResult };
            }

            // Case 3: Login successful
            console.log('✓ Login successful');
            console.log('  Access Token:', loginResult.accessToken.substring(0, 20) + '...');
            console.log('  Session ID:', loginResult.sessionId);
            console.log('  User:', loginResult.user.fullName);
            console.log('  Role:', loginResult.user.roleId);

            return loginResult;
        } catch (error) {
            console.error('✗ Login failed:', error.message);
            throw error;
        }
    }

    /**
     * Example 3: User Repository Operations
     */
    async exampleUserRepository() {
        console.log('\n=== USER REPOSITORY OPERATIONS ===\n');

        try {
            // Create user directly
            const user = await this.userRepo.create({
                email: 'jane.smith@example.com',
                phone: '+9876543210',
                password: 'AnotherSecure123!',
                full_name: 'Jane Smith',
                roleId: 'instructor',
                isVerified: true,
                isActive: true
            });

            console.log('✓ User created via repository');
            console.log('  User ID:', user.user_id);
            console.log('  Email:', user.email);
            console.log('  Role:', user.role_id);

            // Find user by email
            const foundUser = await this.userRepo.findByEmail('jane.smith@example.com');
            console.log('\n✓ User found by email');
            console.log('  Full name:', foundUser.full_name);
            console.log('  Is verified:', foundUser.is_verified);

            // Update user
            await this.userRepo.update(user.user_id, {
                full_name: 'Jane Smith-Doe',
                isVerified: true
            });
            console.log('\n✓ User updated');

            // Get all users
            const allUsers = await this.userRepo.findAll({
                page: 1,
                limit: 10,
                search: '',
                isActive: true
            });
            console.log('\n✓ Retrieved all users');
            console.log('  Total users:', allUsers.pagination.total);
            console.log('  Users on page:', allUsers.users.length);

            return user.user_id;
        } catch (error) {
            console.error('✗ Repository operation failed:', error.message);
            throw error;
        }
    }

    /**
     * Example 4: Password Operations
     */
    async examplePasswordOperations(email) {
        console.log('\n=== PASSWORD OPERATIONS ===\n');

        try {
            // Step 1: Initiate forgot password
            const forgotResult = await this.authService.forgotPassword(email);
            console.log('✓ Forgot password initiated');
            console.log('  OTP Token:', forgotResult.otpToken);

            // Step 2: Verify OTP
            const otpCode = '123456';
            const verifyResult = await this.authService.verifyResetPasswordOtp(
                forgotResult.otpToken,
                otpCode
            );
            console.log('\n✓ OTP verified');
            console.log('  Reset Token:', verifyResult.resetToken.substring(0, 20) + '...');

            // Step 3: Reset password
            const resetResult = await this.authService.resetPassword(
                verifyResult.resetToken,
                'NewSecurePass456!'
            );
            console.log('\n✓ Password reset successful');
            console.log('  Message:', resetResult.message);

            return true;
        } catch (error) {
            console.error('✗ Password operation failed:', error.message);
            throw error;
        }
    }

    /**
     * Example 5: Working with Roles and Permissions
     */
    async exampleRolesAndPermissions() {
        console.log('\n=== ROLES & PERMISSIONS ===\n');

        try {
            const { Role, Permission, User } = db;

            // Get user with role and permissions
            const user = await User.findOne({
                where: { email: 'john.doe@example.com' },
                include: [{
                    model: Role,
                    as: 'role',
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        through: { attributes: [] }
                    }]
                }]
            });

            if (user) {
                console.log('✓ User with role loaded');
                console.log('  User:', user.full_name);
                console.log('  Role:', user.role.name);
                console.log('  Permissions:', user.role.permissions.length);
                
                console.log('\n  Permission list:');
                user.role.permissions.slice(0, 5).forEach(perm => {
                    console.log(`    - ${perm.id}: ${perm.label}`);
                });
                
                if (user.role.permissions.length > 5) {
                    console.log(`    ... and ${user.role.permissions.length - 5} more`);
                }
            }

            // Get all roles
            const roles = await Role.findAll({
                include: [{
                    model: Permission,
                    as: 'permissions',
                    through: { attributes: [] }
                }]
            });

            console.log('\n✓ All roles loaded');
            roles.forEach(role => {
                console.log(`  - ${role.name}: ${role.permissions.length} permissions`);
            });

            return true;
        } catch (error) {
            console.error('✗ Roles and permissions operation failed:', error.message);
            throw error;
        }
    }

    /**
     * Example 6: Account Security Features
     */
    async exampleAccountSecurity() {
        console.log('\n=== ACCOUNT SECURITY FEATURES ===\n');

        try {
            const user = await this.userRepo.findByEmail('john.doe@example.com');

            // Check if account is locked
            const isLocked = user.isLocked();
            console.log('✓ Account lock status:', isLocked ? 'LOCKED' : 'ACTIVE');

            // Simulate failed login attempts
            console.log('\n✓ Simulating failed login attempts...');
            for (let i = 1; i <= 3; i++) {
                await user.incrementFailedAttempts();
                console.log(`  Attempt ${i}: ${user.failed_login_attempts} failed attempts`);
            }

            // Reset failed attempts
            await user.resetFailedAttempts();
            console.log('\n✓ Failed attempts reset');

            // Get safe user object (no sensitive data)
            const safeUser = user.toSafeObject();
            console.log('\n✓ Safe user object:');
            console.log('  Has password_hash:', 'password_hash' in safeUser ? 'YES (BAD!)' : 'NO (GOOD!)');
            console.log('  Has mfa_secret:', 'mfa_secret' in safeUser ? 'YES (BAD!)' : 'NO (GOOD!)');
            console.log('  Has user_id:', 'user_id' in safeUser ? 'YES' : 'NO');

            return true;
        } catch (error) {
            console.error('✗ Security operation failed:', error.message);
            throw error;
        }
    }
}

/**
 * Run all examples
 */
async function runExamples() {
    try {
        console.log('╔══════════════════════════════════════════╗');
        console.log('║  AUTH SYSTEM COMPLETE USAGE EXAMPLES     ║');
        console.log('╚══════════════════════════════════════════╝');

        // Connect to database
        await db.testConnection();
        console.log('\n✅ Database connected\n');

        // Create example instance
        const example = new AuthSystemExample();

        // Run examples
        // await example.exampleRegistration();
        // await example.exampleLogin('john.doe@example.com', 'SecurePass123!');
        // await example.exampleUserRepository();
        // await example.examplePasswordOperations('jane.smith@example.com');
        await example.exampleRolesAndPermissions();
        // await example.exampleAccountSecurity();

        console.log('\n\n✅ All examples completed successfully!\n');

        // Close database connection
        await db.closeConnection();
        process.exit(0);
    } catch (error) {
        logger.error('Example execution failed:', error);
        console.error('\n\n❌ Example failed:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    runExamples();
}

module.exports = AuthSystemExample;