const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../lib/logger');

/** Strip one layer of surrounding quotes (common in .env on Windows). */
function envTrim(key) {
    const v = process.env[key];
    if (v == null || v === '') return v;
    const t = String(v).trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        return t.slice(1, -1);
    }
    return t;
}

class EmailService {
    constructor() {
        this.transporter = null;
        this._configHash = null;
        this.templateDir = path.join(__dirname, '../templates/email');
        this._initFromEnv();
    }

    _smtpFromEnv() {
        const host = envTrim('SMTP_HOST');
        const user = envTrim('SMTP_USER');
        const pass = envTrim('SMTP_PASS');
        const port = parseInt(envTrim('SMTP_PORT'), 10) || 587;
        const secure = envTrim('SMTP_SECURE') === 'true';
        return { host, port, secure, auth: { user, pass } };
    }

    _initFromEnv() {
        const cfg = this._smtpFromEnv();
        this.transporter = nodemailer.createTransport(cfg);
        this._configHash = JSON.stringify(cfg);
    }

    invalidateTransporter() {
        this.transporter = null;
        this._configHash = null;
    }

    async _ensureTransporter() {
        let cfg;
        try {
            const systemSettingsService = require('./systemSettingsService');
            const smtp = await systemSettingsService.getSmtpConfig();
            cfg = {
                host: smtp.host,
                port: smtp.port,
                secure: smtp.secure,
                auth: { user: smtp.user, pass: smtp.pass },
            };
            this._fromName = smtp.fromName;
            this._fromEmail = smtp.fromEmail;
        } catch (_) {
            cfg = this._smtpFromEnv();
        }
        const hash = JSON.stringify(cfg);
        if (!this.transporter || hash !== this._configHash) {
            this.transporter = nodemailer.createTransport(cfg);
            this._configHash = hash;
        }
        return this.transporter;
    }

    /**
     * Load and render an HTML template file
     * Replaces {{VARIABLE}} placeholders with actual values
     * @param {string} templateFile - e.g. 'verification.html'
     * @param {Object} variables - key-value pairs to inject
     */
    async _renderTemplate(templateFile, variables = {}) {
        const templatePath = path.join(this.templateDir, templateFile);

        try {
            let html = await fs.readFile(templatePath, 'utf-8');

            // Replace all {{VARIABLE}} placeholders
            Object.entries(variables).forEach(([key, value]) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                html = html.replace(regex, value);
            });

            return html;
        } catch (error) {
            logger.error(`[EMAIL] Failed to load template "${templateFile}":`, error);
            throw new Error(`Template not found: ${templateFile}`);
        }
    }

    /**
     * Send OTP email using a template
     * Called from authService._sendEmailOtp(email, otp, purpose)
     * 
     * @param {string} to      - Recipient email
     * @param {string} otp     - The OTP code
     * @param {string} purpose - e.g. 'registration', 'password_reset', 'device_verification'
     */

    async sendPasswordChanged(user, meta) {
        const html = fs.readFileSync('templates/password_changed.html', 'utf8');

        return html
            .replace('John Doe', user.full_name)
            .replace('Feb 17, 2026 · 03:42 PM', new Date().toLocaleString())
            .replace('192.168.1.104', meta.ipAddress)
            .replace('Chrome · Windows 11', meta.userAgent)
            .replace('Jakarta, Indonesia', meta.location || 'Unknown')
            .replace('href="#" class="cta-btn"', `href="${meta.secureLink}" class="cta-btn"`);
    }


    async send(to, messageOrOtp, purpose, meta = {}) {

        // Password changed uses meta — different flow
        if (purpose === 'password_changed') {
            const { subject, templateFile } = this._resolveOtpMeta(purpose);

            const html = await this._renderTemplate(templateFile, {
                FULL_NAME: meta.fullName || 'User',
                CHANGED_AT: meta.changedAt || new Date().toLocaleString(),
                IP_ADDRESS: meta.ipAddress || 'Unknown',
                DEVICE: meta.device || 'Unknown',
                LOCATION: meta.location || 'Unknown',
                SECURE_LINK: meta.secureLink || `${process.env.APP_URL}/auth/login`,
                YEAR: new Date().getFullYear(),
                APP_NAME: process.env.EMAIL_FROM_NAME || 'App',
            });

            return this._dispatch(to, subject, html);
        }

        // All OTP purposes — existing logic untouched
        const { subject, templateFile } = this._resolveOtpMeta(purpose);

        const html = await this._renderTemplate(templateFile, {
            OTP: messageOrOtp,
            PURPOSE: this._formatPurpose(purpose),
            EMAIL: to,
            EXPIRY_MINUTES: '5',
            YEAR: new Date().getFullYear(),
            APP_NAME: process.env.EMAIL_FROM_NAME || 'App',
        });

        return this._dispatch(to, subject, html);
    }

    /**
     * Send any custom email (subject + html directly)
     */
    async sendCustom(to, subject, templateFile, variables = {}) {
        const html = await this._renderTemplate(templateFile, variables);
        return this._dispatch(to, subject, html);
    }

    /**
     * Internal dispatcher — sends the actual email
     */
    async _dispatch(to, subject, html) {
        const transporter = await this._ensureTransporter();
        let rawFrom = envTrim('SMTP_FROM');
        try {
            const systemSettingsService = require('./systemSettingsService');
            const smtp = await systemSettingsService.getSmtpConfig();
            if (smtp.fromEmail) rawFrom = smtp.fromEmail;
            if (smtp.fromName) this._fromName = smtp.fromName;
        } catch (_) { /* use env */ }

        if (!rawFrom) {
            throw new Error('[EMAIL] SMTP_FROM is not set in .env');
        }

        const fromName = this._fromName || envTrim('EMAIL_FROM_NAME') || 'App';

        // Avoid "Name" <"Display" <email>> — if SMTP_FROM already contains <…>, use as-is (RFC 5322)
        const fromHeader = rawFrom.includes('<')
            ? rawFrom
            : `"${fromName}" <${rawFrom}>`;

        const recipient = to?.trim();
        if (!recipient) {
            throw new Error('[EMAIL] Recipient email is missing or invalid');
        }

        if (!envTrim('SMTP_HOST') || !envTrim('SMTP_USER')) {
            throw new Error('[EMAIL] SMTP_HOST and SMTP_USER must be set in .env');
        }

        const mailOptions = {
            from: fromHeader,
            to: recipient,
            subject,
            html,
            text: html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            logger.info(`[EMAIL] Sent "${subject}" → ${to} (${info.messageId})`);
            return info;
        } catch (error) {
            logger.error(`[EMAIL] Failed to send to ${to}:`, error);
            throw new Error(`Email delivery failed: ${error.message}`);
        }
    }
    /**
     * Map purpose → subject + template file
     */
    _resolveOtpMeta(purpose) {
        const map = {
            registration: { subject: 'Verify Your Email', templateFile: 'verification.html' },
            password_reset: { subject: 'Password Reset Code', templateFile: 'verification.html' },
            device_verification: { subject: 'New Device Verification Code', templateFile: 'verification.html' },
            login: { subject: 'Your Login OTP', templateFile: 'verification.html' },
            password_changed: {
                subject: 'Your Password Has Been Changed',
                templateFile: 'password_changed.html',
            },
            '2fa': { subject: 'Two-Factor Authentication', templateFile: 'verification.html' },
        };

        return map[purpose?.toLowerCase()] || {
            subject: 'Your OTP Code',
            templateFile: 'verification.html',
        };
    }

    _formatPurpose(purpose) {
        const labels = {
            registration: 'Email Verification',
            password_reset: 'Password Reset',
            device_verification: 'Device Verification',
            login: 'Login',
            '2fa': 'Two-Factor Authentication',
        };
        return labels[purpose?.toLowerCase()] || 'Verification';
    }

    /**
     * Verify SMTP connection (call on app startup)
     */
    async verify() {
        try {
            const transporter = await this._ensureTransporter();
            await transporter.verify();
            logger.info('[EMAIL] SMTP connection verified');
        } catch (error) {
            logger.error('[EMAIL] SMTP connection failed:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();