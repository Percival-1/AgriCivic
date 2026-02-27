"""
Security hardening utilities for the AI-Driven Agri-Civic Intelligence Platform.

This module provides:
- Input validation and sanitization
- Data encryption for sensitive information
- Security utilities and helpers
"""

import re
import html
import hashlib
import secrets
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64

from pydantic import BaseModel, Field, validator
from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.config import get_settings

logger = get_logger(__name__)
settings = get_settings()


class InputValidator:
    """Comprehensive input validation and sanitization."""

    # Regex patterns for common validations
    PHONE_PATTERN = re.compile(r"^\+?[1-9]\d{1,14}$")  # E.164 format
    EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    ALPHANUMERIC_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")
    LANGUAGE_CODE_PATTERN = re.compile(r"^[a-z]{2}(-[A-Z]{2})?$")

    # Dangerous patterns to detect
    SQL_INJECTION_PATTERNS = [
        r"(\bUNION\b.*\bSELECT\b)",
        r"(\bDROP\b.*\bTABLE\b)",
        r"(\bINSERT\b.*\bINTO\b)",
        r"(\bDELETE\b.*\bFROM\b)",
        r"(\bUPDATE\b.*\bSET\b)",
        r"(--|#|\/\*|\*\/)",
        r"(\'\s*OR\s+.*=)",
        r"(\bSELECT\b.*\bFROM\b)",
    ]

    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe",
        r"<object",
        r"<embed",
    ]

    PATH_TRAVERSAL_PATTERNS = [
        r"\.\./",
        r"\.\.",
        r"%2e%2e",
        r"\.\.\\",
    ]

    @staticmethod
    def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
        """
        Sanitize string input by removing dangerous characters.

        Args:
            value: Input string to sanitize
            max_length: Maximum allowed length

        Returns:
            Sanitized string
        """
        if not isinstance(value, str):
            raise ValueError("Input must be a string")

        # Strip whitespace
        value = value.strip()

        # Check length
        if max_length and len(value) > max_length:
            raise ValueError(f"Input exceeds maximum length of {max_length}")

        # HTML escape to prevent XSS
        value = html.escape(value)

        return value

    @classmethod
    def validate_phone_number(cls, phone: str) -> str:
        """
        Validate and sanitize phone number.

        Args:
            phone: Phone number to validate

        Returns:
            Validated phone number

        Raises:
            ValueError: If phone number is invalid
        """
        phone = phone.strip().replace(" ", "").replace("-", "")

        if not cls.PHONE_PATTERN.match(phone):
            raise ValueError("Invalid phone number format")

        return phone

    @classmethod
    def validate_email(cls, email: str) -> str:
        """
        Validate and sanitize email address.

        Args:
            email: Email address to validate

        Returns:
            Validated email address

        Raises:
            ValueError: If email is invalid
        """
        email = email.strip().lower()

        if not cls.EMAIL_PATTERN.match(email):
            raise ValueError("Invalid email format")

        return email

    @classmethod
    def validate_language_code(cls, lang_code: str) -> str:
        """
        Validate language code format.

        Args:
            lang_code: Language code to validate (e.g., 'en', 'hi', 'en-US')

        Returns:
            Validated language code

        Raises:
            ValueError: If language code is invalid
        """
        lang_code = lang_code.strip().lower()

        if not cls.LANGUAGE_CODE_PATTERN.match(lang_code):
            raise ValueError("Invalid language code format")

        return lang_code

    @classmethod
    def detect_sql_injection(cls, value: str) -> bool:
        """
        Detect potential SQL injection attempts.

        Args:
            value: String to check

        Returns:
            True if SQL injection detected, False otherwise
        """
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f"Potential SQL injection detected: {pattern}")
                return True
        return False

    @classmethod
    def detect_xss(cls, value: str) -> bool:
        """
        Detect potential XSS attempts.

        Args:
            value: String to check

        Returns:
            True if XSS detected, False otherwise
        """
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f"Potential XSS detected: {pattern}")
                return True
        return False

    @classmethod
    def detect_path_traversal(cls, value: str) -> bool:
        """
        Detect potential path traversal attempts.

        Args:
            value: String to check

        Returns:
            True if path traversal detected, False otherwise
        """
        for pattern in cls.PATH_TRAVERSAL_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f"Potential path traversal detected: {pattern}")
                return True
        return False

    @classmethod
    def validate_input(cls, value: str, max_length: int = 1000) -> str:
        """
        Comprehensive input validation.

        Args:
            value: Input to validate
            max_length: Maximum allowed length

        Returns:
            Sanitized input

        Raises:
            HTTPException: If dangerous patterns detected
        """
        # Check for dangerous patterns
        if cls.detect_sql_injection(value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid input: potential SQL injection detected",
            )

        if cls.detect_xss(value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid input: potential XSS detected",
            )

        if cls.detect_path_traversal(value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid input: potential path traversal detected",
            )

        # Sanitize and return
        return cls.sanitize_string(value, max_length)

    @staticmethod
    def validate_json_input(data: Dict[str, Any], max_depth: int = 5) -> Dict[str, Any]:
        """
        Validate JSON input to prevent deeply nested structures.

        Args:
            data: JSON data to validate
            max_depth: Maximum nesting depth allowed

        Returns:
            Validated data

        Raises:
            ValueError: If data exceeds max depth
        """

        def check_depth(obj: Any, current_depth: int = 0) -> int:
            if current_depth > max_depth:
                raise ValueError(f"JSON nesting exceeds maximum depth of {max_depth}")

            if isinstance(obj, dict):
                return max(
                    (check_depth(v, current_depth + 1) for v in obj.values()),
                    default=current_depth,
                )
            elif isinstance(obj, list):
                return max(
                    (check_depth(item, current_depth + 1) for item in obj),
                    default=current_depth,
                )
            return current_depth

        check_depth(data)
        return data


class DataEncryption:
    """Data encryption utilities for sensitive information."""

    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize encryption with a key.

        Args:
            encryption_key: Base64-encoded encryption key. If None, generates a new key.
        """
        if encryption_key:
            self.key = encryption_key.encode()
        else:
            # Generate key from settings secret
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"agri-platform-salt",  # In production, use a random salt
                iterations=100000,
                backend=default_backend(),
            )
            key = kdf.derive(settings.secret_key.encode())
            self.key = base64.urlsafe_b64encode(key)

        self.cipher = Fernet(self.key)

    def encrypt(self, data: str) -> str:
        """
        Encrypt sensitive data.

        Args:
            data: Plain text data to encrypt

        Returns:
            Encrypted data as base64 string
        """
        try:
            encrypted = self.cipher.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise ValueError("Failed to encrypt data")

    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt sensitive data.

        Args:
            encrypted_data: Base64-encoded encrypted data

        Returns:
            Decrypted plain text
        """
        try:
            decoded = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self.cipher.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise ValueError("Failed to decrypt data")

    def hash_data(self, data: str) -> str:
        """
        Create a one-way hash of data.

        Args:
            data: Data to hash

        Returns:
            Hexadecimal hash string
        """
        return hashlib.sha256(data.encode()).hexdigest()

    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """
        Generate a cryptographically secure random token.

        Args:
            length: Length of the token in bytes

        Returns:
            URL-safe token string
        """
        return secrets.token_urlsafe(length)


class SecureHeaders:
    """Security headers configuration."""

    @staticmethod
    def get_production_headers() -> Dict[str, str]:
        """Get security headers for production environment."""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none';"
            ),
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        }

    @staticmethod
    def get_development_headers() -> Dict[str, str]:
        """Get security headers for development environment."""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": (
                "default-src 'self' https:; "
                "script-src 'self' https: 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' https: 'unsafe-inline'; "
                "img-src 'self' https: data:; "
                "font-src 'self' https: data:;"
            ),
        }


# Global instances
input_validator = InputValidator()
data_encryption = DataEncryption()
secure_headers = SecureHeaders()
