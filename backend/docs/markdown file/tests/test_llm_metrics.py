"""
Test script to verify LLM service metrics tracking.
Run this to generate some test requests and verify metrics are being tracked.
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.services.llm_service import llm_service


async def test_llm_metrics():
    """Test LLM service and verify metrics tracking."""

    print("=" * 60)
    print("LLM Service Metrics Test")
    print("=" * 60)

    # Check initial metrics
    print("\n1. Initial Metrics:")
    initial_metrics = llm_service.get_metrics()
    print(f"   Total Requests: {initial_metrics['total_requests']}")
    print(f"   Successful Requests: {initial_metrics['successful_requests']}")
    print(f"   Failed Requests: {initial_metrics['failed_requests']}")
    print(f"   Total Tokens: {initial_metrics['total_tokens_used']}")
    print(f"   Available Providers: {initial_metrics['available_providers']}")

    # Make a test request
    print("\n2. Making test LLM request...")
    try:
        response = await llm_service.generate_response(
            prompt="Say 'Hello, this is a test!' in exactly 5 words.",
            max_tokens=20,
            temperature=0.0,
        )
        print(f"   ✓ Request successful!")
        print(f"   Provider: {response.provider}")
        print(f"   Model: {response.model}")
        print(f"   Tokens Used: {response.tokens_used}")
        print(f"   Response Time: {response.response_time:.2f}s")
        print(f"   Content: {response.content}")
    except Exception as e:
        print(f"   ✗ Request failed: {e}")

    # Check updated metrics
    print("\n3. Updated Metrics:")
    updated_metrics = llm_service.get_metrics()
    print(f"   Total Requests: {updated_metrics['total_requests']}")
    print(f"   Successful Requests: {updated_metrics['successful_requests']}")
    print(f"   Failed Requests: {updated_metrics['failed_requests']}")
    print(f"   Total Tokens: {updated_metrics['total_tokens_used']}")
    print(f"   Success Rate: {updated_metrics['success_rate'] * 100:.1f}%")
    print(f"   Avg Response Time: {updated_metrics['average_response_time']:.2f}s")
    print(f"   Provider Usage: {updated_metrics['provider_usage']}")

    # Check circuit breaker status
    print("\n4. Circuit Breaker Status:")
    for provider, state in updated_metrics["circuit_breaker_state"].items():
        print(
            f"   {provider}: {state['state']} (failures: {state['failure_count']}, successes: {state['success_count']})"
        )

    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_llm_metrics())
