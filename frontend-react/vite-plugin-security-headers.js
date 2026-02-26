/**
 * Vite Plugin for Security Headers
 * 
 * Adds security headers to development server responses.
 * For production, configure these headers on your web server (Nginx, Apache, etc.)
 * 
 * Requirements: 18.3-18.4
 */

export default function securityHeadersPlugin() {
    return {
        name: 'security-headers',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                // Prevent MIME type sniffing
                res.setHeader('X-Content-Type-Options', 'nosniff');

                // Prevent clickjacking
                res.setHeader('X-Frame-Options', 'DENY');

                // Enable XSS protection
                res.setHeader('X-XSS-Protection', '1; mode=block');

                // Referrer policy
                res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

                // Permissions policy (formerly Feature Policy)
                res.setHeader('Permissions-Policy',
                    'camera=(), microphone=(self), geolocation=(self), payment=()'
                );

                // Strict Transport Security (HTTPS only)
                // Uncomment for production with HTTPS
                // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

                // Content Security Policy
                const csp = [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for dev
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                    "font-src 'self' https://fonts.gstatic.com",
                    "img-src 'self' data: https: blob:",
                    "connect-src 'self' http://localhost:8000 ws://localhost:8000 https://api.openweathermap.org",
                    "media-src 'self' blob:",
                    "object-src 'none'",
                    "base-uri 'self'",
                    "form-action 'self'",
                    "frame-ancestors 'none'",
                ].join('; ');

                res.setHeader('Content-Security-Policy', csp);

                next();
            });
        },
    };
}
