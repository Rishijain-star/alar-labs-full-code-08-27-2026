/**
 * Validation Utilities
 * Functions for validating emails, passwords, phone numbers, etc.
 */

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email
 */
export const isValidEmail = (email) => {
    if (!email) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { isValid, errors }
 */
export const validatePassword = (password) => {
    const errors = [];

    if (!password) {
        return {
            isValid: false,
            errors: ['Password is required']
        };
    }

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate phone number (basic validation)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone
 */
export const isValidPhone = (phone) => {
    if (!phone) return false;

    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Check if it's 10 digits
    return cleaned.length === 10;
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
export const isValidURL = (url) => {
    if (!url) return false;

    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @returns {boolean} - True if valid file type
 */
export const isValidFileType = (file, allowedTypes = []) => {
    if (!file) return false;
    if (allowedTypes.length === 0) return true;

    return allowedTypes.includes(file.type);
};

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSizeInMB - Maximum file size in MB
 * @returns {boolean} - True if file size is valid
 */
export const isValidFileSize = (file, maxSizeInMB = 5) => {
    if (!file) return false;

    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
};

/**
 * Validate image dimensions
 * @param {File} file - Image file to validate
 * @param {Object} dimensions - { minWidth, maxWidth, minHeight, maxHeight }
 * @returns {Promise<Object>} - { isValid, width, height, errors }
 */
export const validateImageDimensions = (file, dimensions = {}) => {
    return new Promise((resolve) => {
        if (!file || !file.type.startsWith('image/')) {
            resolve({
                isValid: false,
                errors: ['File is not an image']
            });
            return;
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const {
                width,
                height
            } = img;
            const errors = [];

            if (dimensions.minWidth && width < dimensions.minWidth) {
                errors.push(`Image width must be at least ${dimensions.minWidth}px`);
            }

            if (dimensions.maxWidth && width > dimensions.maxWidth) {
                errors.push(`Image width must not exceed ${dimensions.maxWidth}px`);
            }

            if (dimensions.minHeight && height < dimensions.minHeight) {
                errors.push(`Image height must be at least ${dimensions.minHeight}px`);
            }

            if (dimensions.maxHeight && height > dimensions.maxHeight) {
                errors.push(`Image height must not exceed ${dimensions.maxHeight}px`);
            }

            resolve({
                isValid: errors.length === 0,
                width,
                height,
                errors
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({
                isValid: false,
                errors: ['Failed to load image']
            });
        };

        img.src = objectUrl;
    });
};

/**
 * Check if string is empty or whitespace only
 * @param {string} str - String to check
 * @returns {boolean} - True if empty
 */
export const isEmpty = (str) => {
    return !str || str.trim().length === 0;
};

/**
 * Check if value is a valid number
 * @param {any} value - Value to check
 * @returns {boolean} - True if valid number
 */
export const isValidNumber = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Validate age (must be between min and max)
 * @param {number} age - Age to validate
 * @param {number} minAge - Minimum age (default: 13)
 * @param {number} maxAge - Maximum age (default: 120)
 * @returns {Object} - { isValid, error }
 */
export const validateAge = (age, minAge = 13, maxAge = 120) => {
    if (!isValidNumber(age)) {
        return {
            isValid: false,
            error: 'Age must be a valid number'
        };
    }

    if (age < minAge) {
        return {
            isValid: false,
            error: `You must be at least ${minAge} years old`
        };
    }

    if (age > maxAge) {
        return {
            isValid: false,
            error: `Age must be less than ${maxAge}`
        };
    }

    return {
        isValid: true
    };
};

/**
 * Validate credit card number (basic Luhn algorithm)
 * @param {string} cardNumber - Card number to validate
 * @returns {boolean} - True if valid card number
 */
export const isValidCreditCard = (cardNumber) => {
    if (!cardNumber) return false;

    const cleaned = cardNumber.replace(/\s/g, '');

    if (!/^\d{13,19}$/.test(cleaned)) return false;

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i]);

        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
};