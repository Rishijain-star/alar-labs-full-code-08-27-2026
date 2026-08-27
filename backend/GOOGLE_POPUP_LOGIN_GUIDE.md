# Google Popup Login - Frontend Integration Guide

## Overview

This guide shows you how to implement **Google popup-based login** on your frontend without redirects. The flow is:

1. **User clicks "Login with Google"**
2. **Google popup opens** (using Google Sign-In library)
3. **User authenticates** in the popup
4. **Frontend gets ID token** from Google
5. **Frontend sends ID token to backend**
6. **Backend verifies & returns JWT token**
7. **No redirect needed** - Direct JSON response

---

## Environment Setup

### 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Go to **APIs & Services** → **Credentials**
4. Create **OAuth 2.0 Client ID** (Web application type)
5. Add authorized JavaScript origins:
   ```
   http://localhost:3000
   http://localhost:3001
   https://yourdomain.com
   ```
6. Add authorized redirect URIs (for backup):
   ```
   http://localhost:3000/callback
   https://yourdomain.com/callback
   ```
7. Copy **Client ID** - you'll need this in frontend

### 2. .env Configuration

```env
# Backend
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/oauth/google/callback

# Frontend
REACT_APP_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
FRONTEND_URL=http://localhost:3000
```

---

## Frontend Implementation

### Method 1: Using Google Sign-In Library (HTML/JavaScript)

#### Step 1: Add Google Script to HTML

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Google Sign-In Script -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
<body>
    <!-- Google Sign-In Button Container -->
    <div id="g_id_onload"
         data-client_id="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
         data-callback="handleCredentialResponse">
    </div>
    <div class="g_id_signin" data-type="standard"></div>

    <script>
        // This function is called when user signs in
        function handleCredentialResponse(response) {
            // response.credential contains the ID token
            console.log("ID Token:", response.credential);

            // Send to backend
            sendTokenToBackend(response.credential);
        }
    </script>
</body>
</html>
```

#### Step 2: Send Token to Backend

```javascript
async function sendTokenToBackend(idToken) {
    try {
        const response = await fetch('/api/auth/oauth/google/popup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idToken: idToken,
                deviceInfo: {
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                },
                rememberMe: true,
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Login successful! Store tokens
            localStorage.setItem('accessToken', result.data.accessToken);
            localStorage.setItem('sessionId', result.data.sessionId);
            localStorage.setItem('user', JSON.stringify(result.data.user));

            // Redirect to dashboard
            window.location.href = '/dashboard';
        } else {
            // Handle error
            console.error('Login failed:', result.message);
            alert('Login failed: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login');
    }
}
```

---

### Method 2: Using React with react-google-login

#### Installation

```bash
npm install @react-oauth/google
```

#### Implementation

```jsx
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export function LoginPage() {
    const handleSuccess = async (credentialResponse) => {
        try {
            const response = await fetch('/api/auth/oauth/google/popup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idToken: credentialResponse.credential,
                    deviceInfo: {},
                    rememberMe: true,
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Store tokens
                localStorage.setItem('accessToken', result.data.accessToken);
                localStorage.setItem('sessionId', result.data.sessionId);

                // Redirect
                window.location.href = '/dashboard';
            } else {
                alert('Login failed: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during login');
        }
    };

    const handleError = () => {
        console.log('Login Failed');
        alert('Google login failed');
    };

    return (
        <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
            <div className="login-container">
                <h1>Login</h1>
                <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={handleError}
                />
            </div>
        </GoogleOAuthProvider>
    );
}
```

---

### Method 3: Using Vue.js

#### Installation

```bash
npm install @vue-oauth/google
```

#### Implementation

```vue
<template>
  <div class="login-page">
    <h1>Login with Google</h1>
    <GoogleLogin
      :clientId="googleClientId"
      @success="handleLoginSuccess"
      @error="handleLoginError"
    />
  </div>
</template>

<script>
import { GoogleLogin } from '@vue-oauth/google';

export default {
  components: { GoogleLogin },
  data() {
    return {
      googleClientId: process.env.VUE_APP_GOOGLE_CLIENT_ID,
    };
  },
  methods: {
    async handleLoginSuccess(response) {
      try {
        const result = await fetch('/api/auth/oauth/google/popup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: response.credential,
            deviceInfo: {},
            rememberMe: true,
          })
        }).then(res => res.json());

        if (result.status === 'success') {
          // Store tokens
          localStorage.setItem('accessToken', result.data.accessToken);
          localStorage.setItem('sessionId', result.data.sessionId);

          // Redirect
          this.$router.push('/dashboard');
        } else {
          alert('Login failed: ' + result.message);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login');
      }
    },

    handleLoginError() {
      alert('Google login failed');
    }
  }
};
</script>
```

---

## API Endpoint Details

### POST /api/auth/oauth/google/popup

**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ...",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "language": "en-US"
  },
  "rememberMe": true
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Google login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 300,
    "sessionId": "sess_12345",
    "user": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@gmail.com",
      "fullName": "John Doe",
      "roleId": "d4f7781e-4070-4596-b14c-148a59b0992e",
      "oauthProvider": "google",
      "profile_image": "https://...",
      "mfaEnabled": false
    }
  }
}
```

**Response (Error):**
```json
{
  "status": "fail",
  "message": "Invalid Google token signature",
  "statusCode": 400
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `TOKEN_EXPIRED` | Google token is too old | Generate new token |
| `INVALID_SIGNATURE` | Token tampered | Check GOOGLE_CLIENT_ID |
| `REVOKED_TOKEN` | User revoked authorization | User needs to re-authenticate |
| `VERIFICATION_FAILED` | Backend verification failed | Check network & backend logs |
| `ACCOUNT_DISABLED` | User account disabled | Contact admin |

### Error Handling Code

```javascript
async function handleGoogleLogin(idToken) {
    try {
        const response = await fetch('/api/auth/oauth/google/popup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, rememberMe: true })
        });

        const result = await response.json();

        if (!response.ok) {
            // Handle specific errors
            switch (result.code) {
                case 'TOKEN_EXPIRED':
                    alert('Token expired. Please try again.');
                    break;
                case 'INVALID_SIGNATURE':
                    alert('Invalid token. Configuration error.');
                    break;
                case 'ACCOUNT_DISABLED':
                    alert('Your account has been disabled.');
                    break;
                default:
                    alert('Login failed: ' + result.message);
            }
            return;
        }

        // Success - store tokens
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('sessionId', result.data.sessionId);
        window.location.href = '/dashboard';
    } catch (error) {
        console.error('Network error:', error);
        alert('Network error. Please check your connection.');
    }
}
```

---

## Security Considerations

### 1. Token Storage

**❌ NOT Recommended (localStorage):**
```javascript
// Vulnerable to XSS attacks
localStorage.setItem('accessToken', token);
```

**✅ Recommended (httpOnly cookies):**
```javascript
// Server should set httpOnly cookie
// Client cannot access from JavaScript
// Cookie sent automatically with requests
```

### 2. CSRF Protection

```javascript
// Include CSRF token if your API requires it
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

await fetch('/api/auth/oauth/google/popup', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ idToken })
});
```

### 3. HTTPS Required

```javascript
// In production, verify HTTPS
if (process.env.NODE_ENV === 'production' && location.protocol !== 'https:') {
    throw new Error('HTTPS is required for Google authentication');
}
```

---

## Testing

### Test with Curl

```bash
# Get a Google ID token first (use Google Developer Tools or test libraries)
# Then send to backend:

curl -X POST http://localhost:3000/api/auth/oauth/google/popup \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "rememberMe": true
  }'
```

### Test with Postman

1. Open Postman
2. Create POST request to `http://localhost:3000/api/auth/oauth/google/popup`
3. Set Headers:
   - `Content-Type: application/json`
4. Set Body (raw JSON):
   ```json
   {
     "idToken": "your_id_token_here",
     "rememberMe": true
   }
   ```
5. Send request

---

## Comparing Approaches

### Google Popup (Recommended)
| Feature | Popup | Redirect |
|---------|-------|----------|
| User Experience | Better (no page reload) | Redirects away |
| Speed | Faster | Slower |
| SPA Friendly | Yes | No |
| Mobile Friendly | Yes | Yes |
| Implementation | Simple | Moderate |
| Backend Complexity | Simple | Moderate |

---

## Troubleshooting

### Problem: "Invalid Client ID"
```
Solution: Verify GOOGLE_CLIENT_ID matches in:
- Google Cloud Console
- Backend .env
- Frontend env variables
```

### Problem: "CORS Error"
```
Solution: Ensure backend allows:
- POST /api/auth/oauth/google/popup
- From frontend origin
```

### Problem: "Token not received in handleCredentialResponse"
```javascript
// Check if Google script loaded
if (!window.google) {
    console.error('Google library not loaded');
    // Reload page or retry
}
```

### Problem: "Backend says token invalid"
```
Solution: Check:
1. GOOGLE_CLIENT_ID correct in backend
2. Date/time is synchronized (NTP)
3. Token not expired
4. Token not modified in transit
```

---

## Advanced: Fallback to Redirect Approach

If popup approach doesn't work, fallback to redirect:

```javascript
async function googleLogin() {
    try {
        // Try popup approach
        const result = await tryPopupApproach();
        loginWithToken(result);
    } catch (error) {
        console.log('Popup approach failed, falling back to redirect');
        // Fallback to redirect approach
        window.location.href = '/api/auth/oauth/google';
    }
}
```

---

## Complete Example App

```html
<!DOCTYPE html>
<html>
<head>
    <title>Google Login</title>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
        .container { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Login</h1>
        <div id="g_id_onload"
             data-client_id="YOUR_CLIENT_ID.apps.googleusercontent.com"
             data-callback="handleCredentialResponse">
        </div>
        <div class="g_id_signin" data-type="standard"></div>
        <p id="message"></p>
    </div>

    <script>
        function handleCredentialResponse(response) {
            const messageEl = document.getElementById('message');
            messageEl.innerText = 'Logging in...';
            messageEl.style.color = 'blue';

            fetch('/api/auth/oauth/google/popup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idToken: response.credential,
                    rememberMe: true
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    messageEl.innerText = 'Login successful! Redirecting...';
                    messageEl.style.color = 'green';
                    localStorage.setItem('accessToken', data.data.accessToken);
                    setTimeout(() => window.location.href = '/dashboard', 1500);
                } else {
                    messageEl.innerText = 'Error: ' + data.message;
                    messageEl.style.color = 'red';
                }
            })
            .catch(error => {
                messageEl.innerText = 'Error: ' + error.message;
                messageEl.style.color = 'red';
            });
        }

        // Handle sign out
        function handleSignOut() {
            google.accounts.id.disableAutoSelect();
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
        }
    </script>
</body>
</html>
```

---

## Summary

✅ **Backend is configured correctly for popup login**
- Validates Google ID tokens with `google-auth-library`
- Creates/finds users automatically
- Returns JWT tokens without redirect

✅ **Frontend implementation steps:**
1. Add Google Sign-In script
2. Create HTML button/container
3. Handle token in callback
4. Send to `/api/auth/oauth/google/popup`
5. Store JWT from response
6. Redirect to dashboard

This approach is **secure**, **fast**, and **works great with SPAs**!
