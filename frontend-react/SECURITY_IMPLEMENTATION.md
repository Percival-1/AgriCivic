# Security Implementation Guide

This document describes the security measures implemented in the React frontend application to prevent XSS attacks and protect user data.

## Requirements Coverage

This implementation addresses Requirements 18.1-18.6:
- 18.1: Secure JWT token storage
- 18.2: Input sanitization to prevent XSS
- 18.3: HTTPS enforcement
- 18.4: Content Security Policy
- 18.5: No sensitive information exposure
- 18.6: Token revocation mechanism

## Input Sanitization

### Core Sanitization Functions

Located in `src/utils/security.js`:

1. **sanitizeInput(input)** - Escapes HTML special characters
2. **sanitizeHTML(html)** - Removes all HTML tags
3. **sanitizeHTMLWithTags(html, allowedTags)** - Allows specific safe HTML tags
4. **sanitizeURL(url)** - Blocks dangerous URL protocols (javascript:, data:, etc.)
5. **sanitizeObject(obj, excludeKeys)** - Recursively sanitizes object properties
6. **sanitizeFilename(filename)** - Prevents path traversal attacks

### Usage Examples

```javascript
import { sanitizeInput, sanitizeURL, sanitizeObject } from './utils/security';

// Sanitize user input
const safeInput = sanitizeInput(userInput);

// Sanitize URL
const safeUrl = sanitizeURL(userProvidedUrl);

// Sanitize form data
const safeFormData = sanitizeObject(formData, ['password']);
```

### Custom Hook

Use the `useSanitize` hook for easy access to sanitization functions:

```javascript
import { useSanitize } from './hooks/useSanitize';

function MyComponent() {
  const { sanitizeText, sanitizeUrl, sanitizeFormData } = useSanitize();

  const handleSubmit = (data) => {
    const safeData = sanitizeFormData(data);
    // Submit safe data
  };
}
```

### Sanitized Components

Use pre-built sanitized input components:

```javascript
import SanitizedInput from './components/common/SanitizedInput';
import SanitizedTextarea from './components/common/SanitizedTextarea';

function MyForm() {
  return (
    <form>
      <SanitizedInput
        value={value}
        onChange={handleChange}
        placeholder="Enter text"
      />
      <SanitizedTextarea
        value={description}
        onChange={handleDescriptionChange}
      />
    </form>
  );
}
```

## Automatic Sanitization

### Axios Interceptor

All API requests are selectively sanitized via Axios interceptor in `src/api/axios.js`:

- Request data is sanitized before sending to backend (except for auth endpoints)
- Excludes sensitive fields: password, token, refresh_token, access_token, api_key, role, roles, is_admin, isAdmin
- Does not sanitize FormData (used for file uploads)
- Does not sanitize GET requests
- Does not sanitize authentication endpoints (/auth/, /token, /refresh)

```javascript
// Automatically applied to non-auth POST/PUT/PATCH requests
axiosInstance.post('/api/endpoint', {
  name: '<script>alert("xss")</script>', // Will be sanitized
  password: 'secret123', // Will NOT be sanitized
  role: 'admin', // Will NOT be sanitized
});
```

## Security Features

### 1. HTTPS Enforcement

Automatically redirects HTTP to HTTPS in production:

```javascript
import { enforceHTTPS } from './utils/security';

// Called on app initialization
enforceHTTPS();
```

### 2. Secure Token Storage

JWT tokens are stored in localStorage with:
- Automatic token refresh on expiration
- Token removal on logout
- Secure storage wrapper with base64 encoding

```javascript
import { secureStorage } from './utils/security';

// Store sensitive data
secureStorage.set('key', value);

// Retrieve data
const value = secureStorage.get('key');
```

### 3. Rate Limiting

Client-side rate limiting prevents abuse:

```javascript
import { rateLimit } from './utils/security';

if (rateLimit('login', 5, 60000)) {
  // Proceed with login (max 5 attempts per minute)
} else {
  // Show rate limit error
}
```

### 4. Safe Redirects

Prevents open redirect vulnerabilities:

```javascript
import { safeRedirect, isValidRedirectURL } from './utils/security';

// Only allows same-origin or relative URLs
safeRedirect(userProvidedUrl, '/dashboard');
```

### 5. Content Security Policy

CSP validation in development mode:

```javascript
import { validateCSP } from './utils/security';

// Check for CSP compliance issues
const report = validateCSP();
if (!report.compliant) {
  console.warn('CSP issues:', report.issues);
}
```

## Security Initialization

Security features are initialized on app load in `src/App.jsx`:

```javascript
import { initializeSecurity } from './utils/security';

useEffect(() => {
  initializeSecurity();
}, []);
```

This performs:
- HTTPS enforcement
- Security feature checks (crypto, localStorage, etc.)
- CSP validation in development
- Console warnings for missing features

## Best Practices

### DO:
✅ Use sanitization functions for all user inputs
✅ Use SanitizedInput/SanitizedTextarea components
✅ Validate URLs before redirects
✅ Use rate limiting for sensitive operations
✅ Store tokens securely
✅ Implement HTTPS in production

### DON'T:
❌ Trust user input without sanitization
❌ Use dangerouslySetInnerHTML without sanitization
❌ Store sensitive data in plain localStorage
❌ Allow arbitrary redirects
❌ Expose API keys or secrets in client code
❌ Disable security features in production

## Testing Security

Run security tests:

```bash
npm run test -- security
```

Check for XSS vulnerabilities:

```bash
npm run test -- xss
```

## Monitoring

Security features log warnings to console:
- Missing crypto API
- localStorage unavailable
- HTTPS not enabled in production
- CSP compliance issues
- Blocked dangerous URLs

## Additional Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## Updates and Maintenance

Security implementation should be reviewed and updated regularly:
- Monitor for new XSS attack vectors
- Update sanitization rules as needed
- Review CSP policies
- Audit third-party dependencies
- Keep security libraries up to date
