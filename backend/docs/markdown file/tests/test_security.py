"""
Tests for security hardening features.
"""

import pytest
from fastapi import HTTPException

from app.core.security import input_validator, data_encryption


class TestInputValidator:
    """Test input validation and sanitization."""

    def test_sanitize_string(self):
        """Test string sanitization."""
        result = input_validator.sanitize_string("  test  ")
        assert result == "test"

    def test_sanitize_string_max_length(self):
        """Test string length validation."""
        with pytest.raises(ValueError, match="exceeds maximum length"):
            input_validator.sanitize_string("a" * 1001, max_length=1000)

    def test_validate_phone_number_valid(self):
        """Test valid phone number."""
        result = input_validator.validate_phone_number("+1234567890")
        assert result == "+1234567890"

    def test_validate_phone_number_invalid(self):
        """Test invalid phone number."""
        with pytest.raises(ValueError, match="Invalid phone number"):
            input_validator.validate_phone_number("invalid")

    def test_validate_email_valid(self):
        """Test valid email."""
        result = input_validator.validate_email("test@example.com")
        assert result == "test@example.com"

    def test_validate_email_invalid(self):
        """Test invalid email."""
        with pytest.raises(ValueError, match="Invalid email"):
            input_validator.validate_email("invalid-email")

    def test_validate_language_code_valid(self):
        """Test valid language code."""
        result = input_validator.validate_language_code("en")
        assert result == "en"

    def test_validate_language_code_invalid(self):
        """Test invalid language code."""
        with pytest.raises(ValueError, match="Invalid language code"):
            input_validator.validate_language_code("invalid123")

    def test_detect_sql_injection(self):
        """Test SQL injection detection."""
        assert input_validator.detect_sql_injection("SELECT * FROM users")
        assert input_validator.detect_sql_injection("DROP TABLE users")
        assert input_validator.detect_sql_injection("' OR 1=1 --")
        assert not input_validator.detect_sql_injection("normal text")

    def test_detect_xss(self):
        """Test XSS detection."""
        assert input_validator.detect_xss("<script>alert('xss')</script>")
        assert input_validator.detect_xss("javascript:alert('xss')")
        assert input_validator.detect_xss("<img onerror='alert(1)'>")
        assert not input_validator.detect_xss("normal text")

    def test_detect_path_traversal(self):
        """Test path traversal detection."""
        assert input_validator.detect_path_traversal("../../etc/passwd")
        assert input_validator.detect_path_traversal("..\\windows\\system32")
        assert input_validator.detect_path_traversal("%2e%2e/etc/passwd")
        assert not input_validator.detect_path_traversal("normal/path")

    def test_validate_input_with_sql_injection(self):
        """Test input validation with SQL injection."""
        with pytest.raises(HTTPException) as exc_info:
            input_validator.validate_input("SELECT * FROM users")
        assert exc_info.value.status_code == 400
        assert "SQL injection" in exc_info.value.detail

    def test_validate_input_with_xss(self):
        """Test input validation with XSS."""
        with pytest.raises(HTTPException) as exc_info:
            input_validator.validate_input("<script>alert('xss')</script>")
        assert exc_info.value.status_code == 400
        assert "XSS" in exc_info.value.detail

    def test_validate_json_input(self):
        """Test JSON input validation."""
        data = {"key": "value"}
        result = input_validator.validate_json_input(data)
        assert result == data

    def test_validate_json_input_max_depth(self):
        """Test JSON depth validation."""
        # Create deeply nested structure
        data = {"a": {"b": {"c": {"d": {"e": {"f": "value"}}}}}}
        with pytest.raises(ValueError, match="exceeds maximum depth"):
            input_validator.validate_json_input(data, max_depth=3)


class TestDataEncryption:
    """Test data encryption features."""

    def test_encrypt_decrypt(self):
        """Test encryption and decryption."""
        original = "sensitive_data"
        encrypted = data_encryption.encrypt(original)
        decrypted = data_encryption.decrypt(encrypted)
        assert decrypted == original

    def test_encrypt_different_outputs(self):
        """Test that encryption produces different outputs."""
        data = "test_data"
        encrypted1 = data_encryption.encrypt(data)
        encrypted2 = data_encryption.encrypt(data)
        # Due to Fernet's timestamp, outputs should be different
        assert encrypted1 != encrypted2

    def test_hash_data(self):
        """Test data hashing."""
        data = "test_data"
        hash1 = data_encryption.hash_data(data)
        hash2 = data_encryption.hash_data(data)
        # Same input should produce same hash
        assert hash1 == hash2
        # Hash should be hexadecimal
        assert len(hash1) == 64  # SHA-256 produces 64 hex characters

    def test_hash_different_data(self):
        """Test that different data produces different hashes."""
        hash1 = data_encryption.hash_data("data1")
        hash2 = data_encryption.hash_data("data2")
        assert hash1 != hash2

    def test_generate_secure_token(self):
        """Test secure token generation."""
        token1 = data_encryption.generate_secure_token(32)
        token2 = data_encryption.generate_secure_token(32)
        # Tokens should be different
        assert token1 != token2
        # Tokens should be URL-safe
        assert all(c.isalnum() or c in "-_" for c in token1)

    def test_decrypt_invalid_data(self):
        """Test decryption with invalid data."""
        with pytest.raises(ValueError, match="Failed to decrypt"):
            data_encryption.decrypt("invalid_encrypted_data")


class TestSecurityIntegration:
    """Integration tests for security features."""

    def test_phone_validation_in_model(self):
        """Test phone validation in Pydantic model."""
        from app.api.auth import UserRegister

        # Valid phone
        user = UserRegister(phone_number="+1234567890", password="password123")
        assert user.phone_number == "+1234567890"

    def test_invalid_phone_in_model(self):
        """Test invalid phone in Pydantic model."""
        from app.api.auth import UserRegister
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            UserRegister(phone_number="invalid", password="password123")

    def test_language_validation_in_model(self):
        """Test language validation in Pydantic model."""
        from app.api.auth import UserRegister

        user = UserRegister(
            phone_number="+1234567890", password="password123", preferred_language="en"
        )
        assert user.preferred_language == "en"

    def test_name_sanitization_in_model(self):
        """Test name sanitization in Pydantic model."""
        from app.api.auth import UserRegister

        user = UserRegister(
            phone_number="+1234567890", password="password123", name="  John Doe  "
        )
        # Name should be sanitized (HTML escaped and trimmed)
        assert user.name == "John Doe"
