"""
Script to create an admin user for the Agri-Civic Intelligence Platform.

This script creates an admin user with the specified credentials.
Run this script after setting up the database.

Usage:
    python create_admin_user.py
"""

import asyncio
import sys
from getpass import getpass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import auth_service


async def create_admin_user(
    phone_number: str,
    password: str,
    name: str = "Admin User",
    preferred_language: str = "en",
):
    """Create an admin user in the database."""
    async with AsyncSessionLocal() as db:
        try:
            # Check if user already exists
            result = await db.execute(
                select(User).where(User.phone_number == phone_number)
            )
            existing_user = result.scalar_one_or_none()

            if existing_user:
                # Update existing user to admin
                print(f"User with phone number {phone_number} already exists.")
                response = input(
                    "Do you want to promote this user to admin? (yes/no): "
                )
                if response.lower() in ["yes", "y"]:
                    existing_user.role = "admin"
                    existing_user.is_active = True
                    await db.commit()
                    print(f"✓ User {phone_number} has been promoted to admin!")
                    return existing_user
                else:
                    print("Operation cancelled.")
                    return None

            # Create new admin user
            hashed_password = auth_service.get_password_hash(password)
            admin_user = User(
                phone_number=phone_number,
                hashed_password=hashed_password,
                preferred_language=preferred_language,
                name=name,
                role="admin",
                is_active=True,
            )

            db.add(admin_user)
            await db.commit()
            await db.refresh(admin_user)

            print(f"\n✓ Admin user created successfully!")
            print(f"  Phone Number: {phone_number}")
            print(f"  Name: {name}")
            print(f"  Role: admin")
            print(f"  Status: active")
            print(f"\nYou can now login with these credentials.")

            return admin_user

        except Exception as e:
            print(f"\n✗ Error creating admin user: {str(e)}")
            await db.rollback()
            raise


async def main():
    """Main function to run the admin user creation."""
    print("=" * 60)
    print("Admin User Creation Script")
    print("=" * 60)
    print()

    # Get user input
    phone_number = input("Enter admin phone number (e.g., +919876543210): ").strip()
    if not phone_number:
        print("Error: Phone number is required!")
        sys.exit(1)

    name = input("Enter admin name (default: Admin User): ").strip()
    if not name:
        name = "Admin User"

    password = getpass("Enter admin password (min 8 characters): ")
    if len(password) < 8:
        print("Error: Password must be at least 8 characters long!")
        sys.exit(1)

    password_confirm = getpass("Confirm password: ")
    if password != password_confirm:
        print("Error: Passwords do not match!")
        sys.exit(1)

    preferred_language = input("Enter preferred language (default: en): ").strip()
    if not preferred_language:
        preferred_language = "en"

    print("\n" + "-" * 60)
    print("Creating admin user with the following details:")
    print(f"  Phone Number: {phone_number}")
    print(f"  Name: {name}")
    print(f"  Language: {preferred_language}")
    print("-" * 60)
    print()

    confirm = input("Proceed with creation? (yes/no): ")
    if confirm.lower() not in ["yes", "y"]:
        print("Operation cancelled.")
        sys.exit(0)

    # Create admin user
    await create_admin_user(
        phone_number=phone_number,
        password=password,
        name=name,
        preferred_language=preferred_language,
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Fatal error: {str(e)}")
        sys.exit(1)
