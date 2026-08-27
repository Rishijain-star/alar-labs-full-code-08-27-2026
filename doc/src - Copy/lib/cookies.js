// src/lib/cookies.js

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const SESSION_ID_KEY = 'session_id';
const USER_KEY = 'user_data';
const COOKIE_NAMES = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
};

export const cookieUtils = {
    /**
     * Set access token
     */
    deleteCookie(key)  {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    },
    /**
     * Clear all cookies and localStorage (complete cleanup)
     */
    clearAll() {
        try {
            // Clear access token cookie
            this.deleteCookie(COOKIE_NAMES.ACCESS_TOKEN);

            // Clear refresh token cookie
            this.deleteCookie(COOKIE_NAMES.REFRESH_TOKEN);

            // Clear localStorage items
            localStorage.removeItem('user');
            localStorage.removeItem('sessionId');
            localStorage.removeItem('session_id'); // Legacy key

            // Clear RBAC data from localStorage
            clearPermissionCache();

            console.log('✅ All cookies and localStorage cleared');
        } catch (error) {
            console.error('Error clearing all data:', error);
        }
    },

    /**
    * Remove access token
    */
    removeToken() {
        try {
            this.deleteCookie(COOKIE_NAMES.ACCESS_TOKEN);
            console.log('✅ Access token removed');
        } catch (error) {
            console.error('Error removing access token:', error);
        }
    },
    setToken(token, expiresInDays = 7) {
        if (token) {
            const expires = new Date();
            expires.setDate(expires.getDate() + expiresInDays);
            document.cookie = `${TOKEN_KEY}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
        }
    },

    /**
     * Get access token
     */
    getToken() {
        const name = TOKEN_KEY + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(';');

        for (let i = 0; i < cookieArray.length; i++) {
            let cookie = cookieArray[i].trim();
            if (cookie.indexOf(name) === 0) {
                return cookie.substring(name.length, cookie.length);
            }
        }
        return null;
    },

    /**
     * Set refresh token
     */
    setRefreshToken(refreshToken, expiresInDays = 30) {
        if (refreshToken) {
            const expires = new Date();
            expires.setDate(expires.getDate() + expiresInDays);
            document.cookie = `${REFRESH_TOKEN_KEY}=${refreshToken}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
        }
    },

    /**
     * Get refresh token
     */
    getRefreshToken() {
        const name = REFRESH_TOKEN_KEY + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(';');

        for (let i = 0; i < cookieArray.length; i++) {
            let cookie = cookieArray[i].trim();
            if (cookie.indexOf(name) === 0) {
                return cookie.substring(name.length, cookie.length);
            }
        }
        return null;
    },

    /**
     * Set session ID
     */
    setSessionId(sessionId, expiresInDays = 30) {
        if (sessionId) {
            const expires = new Date();
            expires.setDate(expires.getDate() + expiresInDays);
            document.cookie = `${SESSION_ID_KEY}=${sessionId}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
        }
    },

    /**
     * Get session ID
     */
    getSessionId() {
        const name = SESSION_ID_KEY + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(';');

        for (let i = 0; i < cookieArray.length; i++) {
            let cookie = cookieArray[i].trim();
            if (cookie.indexOf(name) === 0) {
                return cookie.substring(name.length, cookie.length);
            }
        }
        return null;
    },

    /**
     * Set user data
     */
    setUser(userData, expiresInDays = 7) {
        if (userData) {
            const userString = JSON.stringify(userData);
            const expires = new Date();
            expires.setDate(expires.getDate() + expiresInDays);
            document.cookie = `${USER_KEY}=${encodeURIComponent(userString)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
        }
    },

    /**
     * Get user data
     */
    getUser() {
        const name = USER_KEY + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(';');

        for (let i = 0; i < cookieArray.length; i++) {
            let cookie = cookieArray[i].trim();
            if (cookie.indexOf(name) === 0) {
                const userString = cookie.substring(name.length, cookie.length);
                try {
                    return JSON.parse(userString);
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    return null;
                }
            }
        }
        return null;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = this.getToken();
        return !!token;
    },

    /**
     * Clear all auth-related cookies
     */
    clearAuth() {
        // Clear access token
        document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

        // Clear refresh token
        document.cookie = `${REFRESH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

        // Clear session ID
        document.cookie = `${SESSION_ID_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

        // Clear user data
        document.cookie = `${USER_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    },

    /**
     * Set complete auth data
     */
    setAuthData({ accessToken, refreshToken, sessionId, user }) {
        if (accessToken) this.setToken(accessToken);
        if (refreshToken) this.setRefreshToken(refreshToken);
        if (sessionId) this.setSessionId(sessionId);
        if (user) this.setUser(user);
    },

    /**
     * Get complete auth data
     */
    getAuthData() {
        return {
            accessToken: this.getToken(),
            refreshToken: this.getRefreshToken(),
            sessionId: this.getSessionId(),
            user: this.getUser(),
            isAuthenticated: this.isAuthenticated(),
        };
    },
};