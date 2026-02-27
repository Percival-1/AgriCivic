"""
Example usage of SMS service for the AI-Driven Agri-Civic Intelligence Platform.

This example demonstrates:
1. Sending individual SMS messages
2. Sending bulk SMS to multiple recipients
3. Formatting different types of agricultural notifications
4. Managing SMS subscriptions
5. Processing incoming SMS queries
"""

import asyncio
from app.services.sms_service import get_sms_service


async def example_send_sms():
    """Example: Send a simple SMS message."""
    print("\n=== Example 1: Send Simple SMS ===")

    sms_service = get_sms_service()

    result = sms_service.send_sms(
        to_number="+919876543211",
        message="Welcome to Agri-Civic Intelligence Platform! Reply with HELP for assistance.",
    )

    print(f"Success: {result['success']}")
    print(f"Message SID: {result.get('message_sid')}")
    print(f"Status: {result.get('status')}")


async def example_send_weather_alert():
    """Example: Send weather alert SMS."""
    print("\n=== Example 2: Send Weather Alert ===")

    sms_service = get_sms_service()

    weather_data = {
        "location": "Delhi",
        "temperature": 35,
        "condition": "Sunny",
        "rainfall_prediction": 10,
        "alert": "Heat wave warning - avoid field work during peak hours",
    }

    formatted_message = sms_service.format_weather_alert(weather_data)
    print(f"Formatted message: {formatted_message}")

    result = sms_service.send_sms(
        to_number="+919876543211",
        message=formatted_message,
        metadata={"type": "weather_alert", "location": "Delhi"},
    )

    print(f"Success: {result['success']}")
    print(f"Message SID: {result.get('message_sid')}")


async def example_send_market_price():
    """Example: Send market price update SMS."""
    print("\n=== Example 3: Send Market Price Update ===")

    sms_service = get_sms_service()

    market_data = {
        "crop": "Wheat",
        "mandi": "Delhi Mandi",
        "price": 2100,
        "previous_price": 2000,
        "date": "2024-01-15",
    }

    formatted_message = sms_service.format_market_price(market_data)
    print(f"Formatted message: {formatted_message}")

    result = sms_service.send_sms(
        to_number="+919876543211",
        message=formatted_message,
        metadata={"type": "market_price", "crop": "Wheat"},
    )

    print(f"Success: {result['success']}")


async def example_send_msp_update():
    """Example: Send MSP update SMS."""
    print("\n=== Example 4: Send MSP Update ===")

    sms_service = get_sms_service()

    msp_data = {
        "crop": "Paddy",
        "msp": 1940,
        "season": "Kharif 2024",
        "effective_date": "2024-06-01",
    }

    formatted_message = sms_service.format_msp_update(msp_data)
    print(f"Formatted message: {formatted_message}")

    result = sms_service.send_sms(
        to_number="+919876543211",
        message=formatted_message,
        metadata={"type": "msp_update", "crop": "Paddy"},
    )

    print(f"Success: {result['success']}")


async def example_send_scheme_notification():
    """Example: Send government scheme notification SMS."""
    print("\n=== Example 5: Send Scheme Notification ===")

    sms_service = get_sms_service()

    scheme_data = {
        "scheme_name": "PM-KISAN",
        "benefit": "₹6000 annual support",
        "deadline": "2024-03-31",
    }

    formatted_message = sms_service.format_scheme_notification(scheme_data)
    print(f"Formatted message: {formatted_message}")

    result = sms_service.send_sms(
        to_number="+919876543211",
        message=formatted_message,
        metadata={"type": "scheme_notification", "scheme": "PM-KISAN"},
    )

    print(f"Success: {result['success']}")


async def example_send_bulk_sms():
    """Example: Send bulk SMS to multiple farmers."""
    print("\n=== Example 6: Send Bulk SMS ===")

    sms_service = get_sms_service()

    recipients = [
        {"phone_number": "+919876543211", "name": "Rajesh Kumar"},
        {"phone_number": "+919876543212", "name": "Priya Sharma"},
        {"phone_number": "+919876543213", "name": "Amit Patel"},
    ]

    message = "Important: Heavy rainfall expected in next 48 hours. Secure your crops and equipment."

    results = sms_service.send_bulk_sms(recipients, message)

    print(f"Total recipients: {results['total']}")
    print(f"Successful: {len(results['successful'])}")
    print(f"Failed: {len(results['failed'])}")

    if results["successful"]:
        print("\nSuccessful deliveries:")
        for success in results["successful"]:
            print(f"  - {success['phone_number']}: {success['message_sid']}")

    if results["failed"]:
        print("\nFailed deliveries:")
        for failure in results["failed"]:
            print(f"  - {failure['phone_number']}: {failure['error']}")


async def example_optimize_message():
    """Example: Optimize long message for SMS."""
    print("\n=== Example 7: Optimize Long Message ===")

    sms_service = get_sms_service()

    long_message = """
    Dear Farmer,
    
    This is a very long message that contains detailed information about the new government scheme
    for agricultural support. The scheme provides financial assistance, subsidies for equipment,
    and training programs. You can apply online or visit your nearest agricultural office.
    Required documents include land records, Aadhaar card, bank details, and income certificate.
    The deadline for application is March 31, 2024. For more information, call our helpline.
    """

    optimized = sms_service.optimize_for_sms(long_message)

    print(f"Original length: {len(long_message)} characters")
    print(f"Optimized length: {len(optimized)} characters")
    print(f"Optimized message: {optimized}")


async def example_validate_phone_numbers():
    """Example: Validate phone numbers."""
    print("\n=== Example 8: Validate Phone Numbers ===")

    sms_service = get_sms_service()

    test_numbers = [
        "+919876543210",  # Valid
        "+911234567890",  # Valid
        "9876543210",  # Invalid - missing +
        "+91",  # Invalid - too short
        "invalid",  # Invalid - not a number
    ]

    for number in test_numbers:
        is_valid = sms_service.validate_phone_number(number)
        print(f"{number}: {'✓ Valid' if is_valid else '✗ Invalid'}")


async def example_process_incoming_sms():
    """Example: Process incoming SMS webhook."""
    print("\n=== Example 9: Process Incoming SMS ===")

    sms_service = get_sms_service()

    # Simulate Twilio webhook data
    webhook_data = {
        "MessageSid": "SM123456789",
        "From": "+919876543211",
        "To": "+919876543210",
        "Body": "What is the weather forecast for tomorrow?",
        "NumMedia": "0",
    }

    parsed = sms_service.process_incoming_sms(webhook_data)

    print(f"Success: {parsed['success']}")
    print(f"From: {parsed['from']}")
    print(f"Message: {parsed['body']}")
    print(f"Message SID: {parsed['message_sid']}")


async def example_get_message_status():
    """Example: Get message delivery status."""
    print("\n=== Example 10: Get Message Status ===")

    sms_service = get_sms_service()

    # First send a message
    result = sms_service.send_sms(
        to_number="+919876543211", message="Test message for status check"
    )

    if result["success"]:
        message_sid = result["message_sid"]
        print(f"Message sent with SID: {message_sid}")

        # Get status
        status = sms_service.get_message_status(message_sid)

        if status["success"]:
            print(f"Status: {status['status']}")
            print(f"To: {status['to']}")
            print(f"From: {status['from']}")
            if status.get("date_sent"):
                print(f"Sent at: {status['date_sent']}")


async def main():
    """Run all examples."""
    print("=" * 60)
    print("SMS Service Examples")
    print("=" * 60)

    # Note: These examples require valid Twilio credentials
    # Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER
    # in your .env file before running

    try:
        await example_send_sms()
        await example_send_weather_alert()
        await example_send_market_price()
        await example_send_msp_update()
        await example_send_scheme_notification()
        await example_send_bulk_sms()
        await example_optimize_message()
        await example_validate_phone_numbers()
        await example_process_incoming_sms()
        await example_get_message_status()

    except Exception as e:
        print(f"\nError: {e}")
        print("\nNote: Make sure Twilio credentials are configured in your .env file:")
        print("  - TWILIO_ACCOUNT_SID")
        print("  - TWILIO_AUTH_TOKEN")
        print("  - TWILIO_PHONE_NUMBER")

    print("\n" + "=" * 60)
    print("Examples completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
