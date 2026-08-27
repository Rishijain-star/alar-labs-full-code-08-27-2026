// src/lib/auth-helpers.js

/**
 * Read the persisted user object out of localStorage.
 * This is the ONE place that does it — everything else imports from here.
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

/**
 * Read the persisted session ID.
 * @returns {string|null}
 */
export const getSessionId = () => localStorage.getItem("sessionId") || null;

/**
 * Synchronous "do we have a valid session?" check.
 *
 * Deliberately checks ONLY localStorage (user + sessionId).
 * The accessToken cookie is short-lived and used only for
 * API request headers — it must NOT gate the "am I logged in"
 * decision, because it expires in 15 min while the session
 * can stay alive much longer (refresh-token flow).
 *
 * @returns {boolean}
 */
export const hasValidSession = () => !!(getCurrentUser() && getSessionId());

/**
 * Full auth snapshot — handy for hydrating Redux initial state.
 */
export const getAuthState = () => ({
    user: getCurrentUser(),
    sessionId: getSessionId(),
    isAuthenticated: hasValidSession(),
});