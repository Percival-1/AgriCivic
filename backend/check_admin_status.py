"""
Script to check admin user status in the database.

This script helps verify if a user has admin privileges.

Usage:
    python check_admin_status.py
"""

import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User


async def check_user_status(phone_number: str):
    """Check if a user has admin privileges."""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(User).where(User.phone_number == phone_number)
            )
            user = result.scalar_one_or_none()

            if not user:
                print(f"\n✗ User with phone number {phone_number} not found!")
                return None

            print("\n" + "=" * 60)
            print("User Status")
            print("=" * 60)
            print(f"ID:           {user.id}")
            print(f"Phone:        {user.phone_number}")
            print(f"Name:         {user.name or 'Not set'}")
            print(f"Role:         {user.role}")
            print(f"Is Active:    {user.is_active}")
            print(f"Language:     {user.preferred_language}")
            print("=" * 60)

            if user.role == "admin":
                print("\n✓ This user HAS admin privileges!")
                print("\nTo access admin features:")
                print("1. Logout from the website")
                print("2. Clear browser cache/localStorage:")
                print("   - Open browser console (F12)")
                print("   - Run: localStorage.clear()")
                print("   - Refresh the page")
                print("3. Login again with this phone number")
                print("4. You should see admin menu in the sidebar")
            else:
                print(
                    f"\n✗ This user does NOT have admin privileges (role: {user.role})"
                )
                print("\nTo promote this user to admin, run:")
                print(f"  python create_admin_user.py")
                print(f"  And enter phone number: {phone_number}")

            return user

        except Exception as e:
            print(f"\n✗ Error checking user status: {str(e)}")
            raise


async def list_all_admins():
    """List all admin users in the database."""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(User).where(User.role == "admin"))
            admins = result.scalars().all()

            if not admins:
                print("\n✗ No admin users found in the database!")
                print("\nTo create an admin user, run:")
                print("  python create_admin_user.py")
                return []

            print("\n" + "=" * 60)
            print(f"Admin Users ({len(admins)} found)")
            print("=" * 60)
            for admin in admins:
                status = "✓ Active" if admin.is_active else "✗ Inactive"
                print(f"\n{status}")
                print(f"  Phone:  {admin.phone_number}")
                print(f"  Name:   {admin.name or 'Not set'}")
                print(f"  ID:     {admin.id}")

            print("\n" + "=" * 60)
            return admins

        except Exception as e:
            print(f"\n✗ Error listing admin users: {str(e)}")
            raise


async def main():
    """Main function."""
    print("=" * 60)
    print("Admin Status Checker")
    print("=" * 60)
    print("\nOptions:")
    print("1. Check specific user")
    print("2. List all admin users")
    print()

    choice = input("Enter your choice (1 or 2): ").strip()

    if choice == "1":
        phone_number = input("\nEnter phone number to check: ").strip()
        if not phone_number:
            print("Error: Phone number is required!")
            return
        await check_user_status(phone_number)
    elif choice == "2":
        await list_all_admins()
    else:
        print("Invalid choice!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
    except Exception as e:
        print(f"\n✗ Fatal error: {str(e)}")
