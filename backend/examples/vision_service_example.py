"""
Example usage of the Vision Service for crop disease identification.

This example demonstrates how to use the vision service to analyze crop images
and identify diseases with treatment recommendations.
"""

import asyncio
import base64
import io
import sys
import os
from pathlib import Path
from PIL import Image, ImageDraw

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.vision_service import vision_service, VisionError


def create_sample_crop_image():
    """
    Create a sample crop image with simulated disease symptoms for testing.

    This creates a synthetic image with green background (representing healthy crop)
    and brown spots (representing disease symptoms).
    """
    # Create a green background (healthy crop)
    image = Image.new("RGB", (400, 300), color=(34, 139, 34))  # Forest green

    # Add some texture to make it look more plant-like
    draw = ImageDraw.Draw(image)

    # Add leaf-like shapes
    for i in range(5):
        x = 50 + i * 60
        y = 100
        # Draw oval leaf shapes
        draw.ellipse([x, y, x + 40, y + 80], fill=(0, 128, 0))
        draw.ellipse([x + 20, y + 40, x + 60, y + 120], fill=(0, 100, 0))

    # Add disease symptoms (brown/orange spots)
    disease_colors = [(139, 69, 19), (160, 82, 45), (205, 133, 63)]  # Brown shades

    for i in range(15):
        # Random-ish positions for disease spots
        x = 60 + (i * 23) % 300
        y = 120 + (i * 17) % 100
        color = disease_colors[i % len(disease_colors)]

        # Draw circular spots of varying sizes
        size = 8 + (i % 3) * 4
        draw.ellipse([x, y, x + size, y + size], fill=color)

        # Add some smaller spots around main spots
        for j in range(2):
            offset_x = x + (j * 15) - 7
            offset_y = y + (j * 10) - 5
            small_size = 3 + j
            draw.ellipse(
                [offset_x, offset_y, offset_x + small_size, offset_y + small_size],
                fill=color,
            )

    return image


def image_to_bytes(image, format="JPEG"):
    """Convert PIL Image to bytes."""
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    return buffer.getvalue()


async def demonstrate_image_validation():
    """Demonstrate image validation functionality."""
    print("🔍 Testing Image Validation...")

    # Create test image
    test_image = create_sample_crop_image()
    image_bytes = image_to_bytes(test_image)

    # Validate image
    validation_result = vision_service.validate_image(image_bytes)

    print(f"✅ Image validation result:")
    print(f"   Valid: {validation_result.is_valid}")
    print(f"   Format: {validation_result.format}")
    print(f"   Size: {validation_result.size}")
    print(f"   File size: {validation_result.file_size_mb:.2f} MB")

    if validation_result.error_message:
        print(f"   Error: {validation_result.error_message}")

    return validation_result.is_valid


async def demonstrate_disease_identification():
    """Demonstrate crop disease identification."""
    print("\n🌱 Testing Crop Disease Identification...")

    # Create sample image
    test_image = create_sample_crop_image()
    image_bytes = image_to_bytes(test_image)

    try:
        # Analyze the image
        print("   Analyzing image... (this may take a few seconds)")

        analysis = await vision_service.identify_disease(
            image_data=image_bytes,
            crop_hint="wheat",
            location_context="Punjab, India - wheat growing region",
            additional_context="Synthetic test image with brown spots on green leaves",
        )

        print(f"✅ Disease Analysis Complete!")
        print(f"   Image ID: {analysis.image_id}")
        print(f"   Processing Time: {analysis.processing_time:.2f} seconds")
        print(f"   Model Used: {analysis.model_used}")
        print(f"   Crop Type: {analysis.crop_type or 'Not identified'}")

        # Display identified diseases
        print(f"\n📋 Identified Diseases ({len(analysis.diseases)}):")
        for i, disease in enumerate(analysis.diseases, 1):
            print(f"   {i}. {disease.disease_name}")
            print(
                f"      Confidence: {disease.confidence_score:.2f} ({disease.confidence_level.value})"
            )
            print(f"      Severity: {disease.severity or 'Not specified'}")
            print(
                f"      Affected Parts: {', '.join(disease.affected_parts) if disease.affected_parts else 'Not specified'}"
            )
            if disease.description:
                print(f"      Description: {disease.description}")
            print()

        # Display primary disease
        if analysis.primary_disease:
            print(f"🎯 Primary Disease: {analysis.primary_disease.disease_name}")
            print(f"   Confidence: {analysis.primary_disease.confidence_score:.2f}")

        # Display treatment recommendations
        print(
            f"\n💊 Treatment Recommendations ({len(analysis.treatment_recommendations)}):"
        )
        for i, treatment in enumerate(analysis.treatment_recommendations, 1):
            print(f"   {i}. {treatment.treatment_type.title()} Treatment")
            if treatment.active_ingredients:
                print(
                    f"      Active Ingredients: {', '.join(treatment.active_ingredients)}"
                )
            if treatment.dosage:
                print(f"      Dosage: {treatment.dosage}")
            if treatment.application_method:
                print(f"      Application: {treatment.application_method}")
            if treatment.timing:
                print(f"      Timing: {treatment.timing}")
            if treatment.precautions:
                print(f"      Precautions: {', '.join(treatment.precautions)}")
            if treatment.cost_estimate:
                print(f"      Cost Estimate: {treatment.cost_estimate}")
            print()

        # Display prevention strategies
        if analysis.prevention_strategies:
            print(f"🛡️ Prevention Strategies:")
            for strategy in analysis.prevention_strategies:
                print(f"   • {strategy}")

        print(f"\n📝 Confidence Summary: {analysis.confidence_summary}")

        return analysis

    except VisionError as e:
        print(f"❌ Vision service error: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None


async def demonstrate_health_check():
    """Demonstrate vision service health check."""
    print("\n🏥 Testing Vision Service Health...")

    try:
        health_status = await vision_service.health_check()

        print(f"✅ Health Check Result:")
        print(f"   Status: {health_status['status']}")
        print(f"   Model: {health_status['model']}")

        if health_status["status"] == "healthy":
            print(f"   Response Time: {health_status.get('response_time', 'N/A')}")
            print(f"   Test Response: {health_status.get('test_response', 'N/A')}")
        else:
            print(f"   Error: {health_status.get('error', 'Unknown error')}")

    except Exception as e:
        print(f"❌ Health check failed: {e}")


async def demonstrate_detailed_treatment():
    """Demonstrate getting detailed treatment information."""
    print("\n📚 Testing Detailed Treatment Information...")

    try:
        treatment_info = await vision_service.get_detailed_treatment_info(
            disease_name="wheat rust", crop_type="wheat"
        )

        print(f"✅ Detailed Treatment Information:")
        print(
            f"   Treatment: {treatment_info.get('detailed_treatment', 'Not available')[:200]}..."
        )
        print(f"   Sources: {len(treatment_info.get('sources', []))} sources found")
        print(f"   Confidence: {treatment_info.get('confidence', 0.0):.2f}")

    except Exception as e:
        print(f"❌ Failed to get detailed treatment info: {e}")


async def main():
    """Main demonstration function."""
    print("🌾 Vision Service Crop Disease Identification Demo")
    print("=" * 60)

    # Check if OpenAI API key is configured
    from app.config import get_settings

    settings = get_settings()

    if not settings.openai_api_key:
        print("⚠️  Warning: OpenAI API key not configured.")
        print("   Set OPENAI_API_KEY in your .env file to test with real API.")
        print("   Continuing with validation and preprocessing tests only...\n")

        # Only run tests that don't require API
        await demonstrate_image_validation()
        return

    print("✅ OpenAI API key configured. Running full demonstration...\n")

    # Run all demonstrations
    validation_success = await demonstrate_image_validation()

    if validation_success:
        await demonstrate_disease_identification()
        await demonstrate_detailed_treatment()

    await demonstrate_health_check()

    print("\n" + "=" * 60)
    print("🎉 Vision Service demonstration completed!")
    print("\nNext steps:")
    print("• Upload real crop images through the API endpoints")
    print("• Integrate with mobile/web applications")
    print("• Test with different crop types and diseases")
    print("• Configure RAG engine for detailed treatment information")


if __name__ == "__main__":
    # Run the demonstration
    asyncio.run(main())
