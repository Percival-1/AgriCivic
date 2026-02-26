# Production Deployment Guide

This guide provides step-by-step instructions for deploying the React frontend to production with optimal security and performance.

## Pre-Deployment Checklist

### Security

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Security headers configured on web server
- [ ] CSP configured without unsafe-inline/unsafe-eval
- [ ] HSTS header enabled
- [ ] CORS configured with specific origins
- [ ] Environment variables secured
- [ ] API keys not exposed in client code
- [ ] Dependencies audited for vulnerabilities
- [ ] Rate limiting implemented on backend
- [ ] Authentication tokens use httpOnly cookies (recommended)

### Performance

- [ ] Code splitting implemented
- [ ] Bundle size optimized (<500KB gzipped)
- [ ] Images optimized and lazy loaded
- [ ] Compression enabled (gzip/brotli)
- [ ] CDN configured for static assets
- [ ] Caching headers configured
- [ ] Service worker for offline support (optional)

### Quality

- [ ] All tests passing
- [ ] No console errors or warnings
- [ ] Accessibility tested
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified
- [ ] Performance metrics meet targets

## Build Process

### 1. Update Environment Variables

Create `.env.production`:

```bash
VITE_API_BASE_URL=https://api.example.com
VITE_SOCKET_URL=wss://api.example.com
VITE_ENV=production
```

### 2. Build Application

```bash
# Install dependencies
npm ci

# Run tests
npm test

# Build for production
npm run build
```

This creates optimized production build in `dist/` directory.

### 3. Verify Build

```bash
# Preview production build locally
npm run preview
```

Test the production build thoroughly before deployment.

## Deployment Options

### Option 1: Static Hosting (Recommended)

Deploy to static hosting services like:

#### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Option 2: Traditional Web Server

#### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL Configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.example.com wss://api.example.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;

    # Root directory
    root /var/www/html/dist;
    index index.html;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (optional)
    location /api {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}
```

#### Apache Configuration

```apache
<VirtualHost *:443>
    ServerName example.com
    DocumentRoot /var/www/html/dist

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5

    # Security Headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.example.com wss://api.example.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"

    # Compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>

    # Caching
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        Header set Cache-Control "max-age=31536000, public, immutable"
    </FilesMatch>

    # SPA routing
    <Directory /var/www/html/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>

# HTTP to HTTPS redirect
<VirtualHost *:80>
    ServerName example.com
    Redirect permanent / https://example.com/
</VirtualHost>
```

## Post-Deployment

### 1. Verify Deployment

- [ ] Application loads correctly
- [ ] All routes work
- [ ] API calls succeed
- [ ] Authentication works
- [ ] WebSocket connections work
- [ ] No console errors

### 2. Test Security

```bash
# Test security headers
curl -I https://example.com

# Test SSL configuration
https://www.ssllabs.com/ssltest/analyze.html?d=example.com

# Test security headers
https://securityheaders.com/?q=example.com
```

### 3. Test Performance

```bash
# Lighthouse audit
npx lighthouse https://example.com --view

# WebPageTest
https://www.webpagetest.org/
```

### 4. Monitor Application

Set up monitoring for:
- Uptime monitoring
- Error tracking (Sentry, Rollbar)
- Performance monitoring (New Relic, DataDog)
- User analytics (Google Analytics, Mixpanel)

## Continuous Deployment

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}

      - name: Deploy to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --delete
        env:
          AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SOURCE_DIR: 'dist'

      - name: Invalidate CloudFront
        uses: chetan/invalidate-cloudfront-action@v2
        env:
          DISTRIBUTION: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
          PATHS: '/*'
          AWS_REGION: 'us-east-1'
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Rollback Plan

### Quick Rollback

If issues occur after deployment:

1. **Revert to previous version**
   ```bash
   # If using Git tags
   git checkout v1.0.0
   npm ci
   npm run build
   # Deploy previous build
   ```

2. **Use CDN rollback**
   - Most CDNs support instant rollback to previous version

3. **Database rollback**
   - If schema changes were made, rollback database migrations

### Gradual Rollout

Use feature flags or canary deployments:

```javascript
// Feature flag example
const useNewFeature = import.meta.env.VITE_ENABLE_NEW_FEATURE === 'true';

if (useNewFeature) {
  // New feature code
} else {
  // Old feature code
}
```

## Maintenance

### Regular Tasks

- [ ] Update dependencies monthly
- [ ] Review security advisories
- [ ] Monitor error logs
- [ ] Review performance metrics
- [ ] Backup configuration
- [ ] Test disaster recovery

### Emergency Procedures

1. **Site Down**
   - Check server status
   - Check DNS configuration
   - Check SSL certificate expiry
   - Review recent deployments

2. **Performance Issues**
   - Check CDN status
   - Review server resources
   - Check database performance
   - Review recent code changes

3. **Security Incident**
   - Follow incident response plan (see SECURITY_GUIDE.md)
   - Notify affected users
   - Document incident

## Support

For deployment issues:
- Check logs: `tail -f /var/log/nginx/error.log`
- Review build output
- Test locally with production build
- Contact DevOps team

## Resources

- [Vite Production Build](https://vitejs.dev/guide/build.html)
- [React Deployment](https://react.dev/learn/start-a-new-react-project#deploying-to-production)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Apache Documentation](https://httpd.apache.org/docs/)
