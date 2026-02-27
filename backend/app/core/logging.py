"""
Logging configuration for the AI-Driven Agri-Civic Intelligence Platform.
"""

import logging
import logging.config
import sys
import os
from typing import Dict, Any


def setup_logging(log_level: str = "INFO", log_format: str = None) -> None:
    """
    Setup logging configuration for the application.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: Custom log format string
    """
    if log_format is None:
        log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)

    # Check if JSON logger is available
    formatters = {
        "default": {
            "format": log_format,
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "detailed": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(funcName)s:%(lineno)d - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    }

    try:
        # Try the new import path first (python-json-logger >= 3.0)
        from pythonjsonlogger import json

        formatters["json"] = {
            "()": "pythonjsonlogger.json.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(module)s %(funcName)s %(lineno)d %(message)s",
        }
    except ImportError:
        try:
            # Fallback to old import path (python-json-logger < 3.0)
            import pythonjsonlogger.jsonlogger

            formatters["json"] = {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "format": "%(asctime)s %(name)s %(levelname)s %(module)s %(funcName)s %(lineno)d %(message)s",
            }
        except ImportError:
            # JSON formatter not available, use detailed formatter as fallback
            formatters["json"] = formatters["detailed"]

    # Define logging configuration
    logging_config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": formatters,
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "default",
                "stream": sys.stdout,
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": log_level,
                "formatter": "detailed",
                "filename": "logs/app.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf8",
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "detailed",
                "filename": "logs/error.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf8",
            },
        },
        "loggers": {
            "": {  # Root logger
                "level": log_level,
                "handlers": ["console", "file", "error_file"],
                "propagate": False,
            },
            "app": {
                "level": log_level,
                "handlers": ["console", "file", "error_file"],
                "propagate": False,
            },
            "uvicorn": {
                "level": log_level,
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn.error": {
                "level": log_level,
                "handlers": ["console", "error_file"],
                "propagate": False,
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "sqlalchemy.engine": {
                "level": "WARNING",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            "httpx": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False,
            },
        },
    }

    # Apply logging configuration
    logging.config.dictConfig(logging_config)

    # Set the logging level for the root logger
    logging.getLogger().setLevel(getattr(logging, log_level.upper()))

    # Log the logging setup
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured with level: {log_level}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.

    Args:
        name: Logger name

    Returns:
        Logger instance
    """
    return logging.getLogger(name)


class StructuredLogger:
    """
    Structured logger for enhanced error tracking and monitoring.

    Provides methods for logging with additional context and metadata.
    """

    def __init__(self, name: str):
        """Initialize structured logger."""
        self.logger = logging.getLogger(name)

    def log_error(
        self,
        message: str,
        error: Exception = None,
        severity: str = "ERROR",
        context: Dict[str, Any] = None,
    ):
        """
        Log error with structured context.

        Args:
            message: Error message
            error: Exception object
            severity: Error severity level
            context: Additional context dictionary
        """
        log_data = {
            "message": message,
            "severity": severity,
            "context": context or {},
        }

        if error:
            log_data["error_type"] = type(error).__name__
            log_data["error_message"] = str(error)

        if severity == "CRITICAL":
            self.logger.critical(str(log_data), extra=log_data)
        elif severity == "ERROR":
            self.logger.error(str(log_data), extra=log_data)
        elif severity == "WARNING":
            self.logger.warning(str(log_data), extra=log_data)
        else:
            self.logger.info(str(log_data), extra=log_data)

    def log_api_call(
        self,
        service: str,
        endpoint: str,
        status: str,
        duration: float,
        context: Dict[str, Any] = None,
    ):
        """
        Log API call with structured data.

        Args:
            service: Service name
            endpoint: API endpoint
            status: Call status (success/failure)
            duration: Call duration in seconds
            context: Additional context
        """
        log_data = {
            "service": service,
            "endpoint": endpoint,
            "status": status,
            "duration_seconds": duration,
            "context": context or {},
        }

        if status == "success":
            self.logger.info(
                f"API call successful: {service}/{endpoint}", extra=log_data
            )
        else:
            self.logger.error(f"API call failed: {service}/{endpoint}", extra=log_data)

    def log_performance(
        self,
        operation: str,
        duration: float,
        threshold: float = None,
        context: Dict[str, Any] = None,
    ):
        """
        Log performance metrics.

        Args:
            operation: Operation name
            duration: Operation duration in seconds
            threshold: Performance threshold
            context: Additional context
        """
        log_data = {
            "operation": operation,
            "duration_seconds": duration,
            "context": context or {},
        }

        if threshold and duration > threshold:
            log_data["threshold_exceeded"] = True
            self.logger.warning(
                f"Performance threshold exceeded: {operation} took {duration:.2f}s",
                extra=log_data,
            )
        else:
            self.logger.info(
                f"Operation completed: {operation} took {duration:.2f}s", extra=log_data
            )


def get_structured_logger(name: str) -> StructuredLogger:
    """
    Get a structured logger instance.

    Args:
        name: Logger name

    Returns:
        StructuredLogger instance
    """
    return StructuredLogger(name)
