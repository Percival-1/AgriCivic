# Security Guide

This guide explains the security measures implemented in the React frontend application.

## Overview

The application implements multiple layers of security to protect user data and prevent common web vulnerabilities.

## Security Headers

### Implemented Headers

1. **Content-Security-Policy (CSP)**
   - Restricts sources for scripts, styles, images, and other resources
   - Prevents XSS attacks by blocking inline scripts (in production)
   - Configured in `index.html` and `vite-plugin-security-headers.js`

2. **X-Content-Type-Options**
   - Set to `nosniff`
   - Prevents MIME type sniffing attacks

3. **X-Frame-Options**
   - Set to `DENY`
   - Prevents clickjacking attacks

4. **X-XSS-Protection**
   - Set to `1; mode=block`
   - Enables browser XSS protection

5. **Referrer-Policy**
   - Set to `strict-origin-when-cross-origin`
   - Controls referrer information sent with requests

6. **Permissions-Policy**
   - Restricts access to browser features
   - Disables camera, microphone (except self), payment APIs

7. **Strict-Transport-Security (HSTS)**
   - Enforces HTTPS connections
   - Should be enabled in production with HTTPS

### Configuration

#### Development

Security headers are set via Vite plugin in `vite-plugin-security-headers.js`:

```javascript
import securityHeadersPlugin from './vite-plugin-security-headers'

export default defineConfig({
  plugins: [
    react(),
    securityHeadersPlugin(),
  ],
})
```

#### Production

For production, configure security headers on your web server:

**Nginx Example:**

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(self), geolocation=(self), payment=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Content Security Policy
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.example.com wss://api.example.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;

    # SSL Configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Other configurations...
}
```

**Apache Example:**

```apache
<VirtualHost *:443>
    ServerName example.com

    # Security Headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(self), geolocation=(self), payment=()"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    
    # Content Security Policy
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.example.com wss://api.example.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5

    # Other configurations...
</VirtualHost>
```

## HTTPS Enforcement

### Implementation

HTTPS is enforced in production via the `enforceHTTPS()` function:

```javascript
import { initializeSecurity } from './utils/security';

// In main.jsx
initializeSecurity();
```

This automatically redirects HTTP requests to HTTPS in production.

### SSL/TLS Configuration

For production deployment:

1. **Obtain SSL Certificate**
   - Use Let's Encrypt for free certificates
   - Or purchase from a trusted CA

2. **Configure Web Server**
   - Enable HTTPS on port 443
   - Redirect HTTP (port 80) to HTTPS
   - Use TLS 1.2 or higher
   - Use strong cipher suites

3. **Test Configuration**
   - Use [SSL Labs](https://www.ssllabs.com/ssltest/) to test SSL configuration
   - Aim for A+ rating

## Input Sanitization

### XSS Prevention

All user inputs are sanitized before display:

```javascript
import { sanitizeInput, sanitizeHTML } from './utils/security';

// Sanitize text input
const safeText = sanitizeInput(userInput);

// Sanitize HTML (removes all HTML tags)
const safeHTML = sanitizeHTML(userHTML);
```

### Form Validation

Forms use React Hook Form with validation:

```javascript
import { useForm } from 'react-hook-form';

const { register, handleSubmit, formState: { errors } } = useForm();

<input
  {...register('email', {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address',
    },
  })}
/>
```

## Authentication Security

### JWT Token Storage

- Tokens stored in localStorage (consider httpOnly cookies for production)
- Tokens included in Authorization header
- Automatic token refresh on expiry
- Tokens cleared on logout

### Protected Routes

Routes are protected using authentication guards:

```javascript
<Route element={<ProtectedRoute><Component /></ProtectedRoute>} />
```

### Session Management

- Sessions expire after inactivity
- Automatic logout on token expiry
- Session data cleared on logout

## API Security

### Request Interceptors

Axios interceptors add security headers:

```javascript
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Response Interceptors

Handle authentication errors:

```javascript
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
    }
    return Promise.reject(error);
  }
);
```

## Rate Limiting

Client-side rate limiting prevents abuse:

```javascript
import { rateLimit } from './utils/security';

if (rateLimit('login', 5, 60000)) {
  // Proceed with login
} else {
  // Show rate limit error
}
```

## Secure Redirects

Prevent open redirect vulnerabilities:

```javascript
import { safeRedirect } from './utils/security';

// Only allows relative URLs or same-origin URLs
safeRedirect(redirectUrl);
```

## Content Security Policy

### Current Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https: blob:;
connect-src 'self' http://localhost:8000 ws://localhost:8000;
media-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

### Production CSP

For production, remove `unsafe-inline` and `unsafe-eval`:

```
default-src 'self';
script-src 'self';
style-src 'self' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https: blob:;
connect-src 'self' https://api.example.com wss://api.example.com;
media-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

## Security Checklist

### Development

- [ ] Use HTTPS for local development (optional)
- [ ] Sanitize all user inputs
- [ ] Validate all form inputs
- [ ] Use security headers plugin
- [ ] Test CSP compliance
- [ ] Review dependencies for vulnerabilities

### Production

- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure security headers on web server
- [ ] Remove console.logs (done via Terser)
- [ ] Enable HSTS header
- [ ] Use strict CSP (no unsafe-inline/unsafe-eval)
- [ ] Implement rate limiting on backend
- [ ] Enable CORS with specific origins
- [ ] Use httpOnly cookies for tokens (recommended)
- [ ] Implement CSRF protection
- [ ] Regular security audits
- [ ] Monitor for security vulnerabilities
- [ ] Keep dependencies updated

## Testing Security

### Manual Testing

1. **Test CSP**
   - Open browser console
   - Check for CSP violations
   - Fix any violations

2. **Test HTTPS**
   - Verify HTTPS redirect works
   - Check SSL certificate validity
   - Test with SSL Labs

3. **Test XSS Protection**
   - Try injecting scripts in inputs
   - Verify scripts are sanitized

4. **Test Authentication**
   - Try accessing protected routes without token
   - Verify token expiry handling
   - Test logout functionality

### Automated Testing

```bash
# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

## Security Tools

### Recommended Tools

1. **OWASP ZAP** - Web application security scanner
2. **Burp Suite** - Security testing toolkit
3. **npm audit** - Check for vulnerable dependencies
4. **Snyk** - Continuous security monitoring
5. **SSL Labs** - SSL/TLS configuration testing

### Browser Extensions

1. **HTTPS Everywhere** - Force HTTPS connections
2. **uBlock Origin** - Block malicious scripts
3. **Privacy Badger** - Block trackers

## Incident Response

### If Security Breach Occurs

1. **Immediate Actions**
   - Disable affected systems
   - Revoke compromised tokens
   - Change all credentials
   - Notify users

2. **Investigation**
   - Review logs
   - Identify breach source
   - Assess damage

3. **Remediation**
   - Fix vulnerability
   - Update security measures
   - Deploy patches

4. **Post-Incident**
   - Document incident
   - Update security policies
   - Conduct security training

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Content Security Policy](https://content-security-policy.com/)
- [SSL Labs](https://www.ssllabs.com/)
- [Security Headers](https://securityheaders.com/)

## Contact

For security issues, please contact: security@example.com
