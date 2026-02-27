"""
Security helper utilities for common security operations.
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.security import input_validator, data_encryption
from app.core.logging import get_logger

logger = get_logger(__name__)


def validate_and_sanitize_input(
    data: str, max_length: Optional[int] = None, field_name: str = "input"
) -> str:
    """
    Validate and sanitize user input.

    Args:
        data: Input data to validate
        max_length: Maximum allowed length
        field_name: Name of the field for error messages

    Returns:
        Sanitized input

    Raises:
        HTTPException: If validation fails
    """
    try:
        return input_validator.validate_input(data, max_length or 1000)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Input validation failed for {field_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}: {str(e)}",
        )


def encrypt_sensitive_data(data: str) -> str:
    """
    Encrypt sensitive data.

    Args:
        data: Plain text data to encrypt

    Returns:
        Encrypted data

    Raises:
        HTTPException: If encryption fails
    """
    try:
        return data_encryption.encrypt(data)
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to encrypt sensitive data",
        )


def decrypt_sensitive_data(encrypted_data: str) -> str:
    """
    Decrypt sensitive data.

    Args:
        encrypted_data: Encrypted data to decrypt

    Returns:
        Decrypted plain text

    Raises:
        HTTPException: If decryption fails
    """
    try:
        return data_encryption.decrypt(encrypted_data)
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt data",
        )


def hash_sensitive_data(data: str) -> str:
    """
    Create a one-way hash of sensitive data.

    Args:
        data: Data to hash

    Returns:
        Hexadecimal hash string
    """
    return data_encryption.hash_data(data)


def validate_json_structure(data: Dict[str, Any], max_depth: int = 5) -> Dict[str, Any]:
    """
    Validate JSON structure to prevent deeply nested attacks.

    Args:
        data: JSON data to validate
        max_depth: Maximum nesting depth

    Returns:
        Validated data

    Raises:
        HTTPException: If validation fails
    """
    try:
        return input_validator.validate_json_input(data, max_depth)
    except ValueError as e:
        logger.warning(f"JSON validation failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


class SecureModel(BaseModel):
    """
    Base model with built-in security features.

    Example usage:
        class UserData(SecureModel):
            name: str
            email: str
            phone: str
    """

    class Config:
        # Validate on assignment
        validate_assignment = True
        # Strip whitespace from strings
        str_strip_whitespace = True
        # Prevent extra fields
        extra = "forbid"
