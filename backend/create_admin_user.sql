-- SQL Script to Create or Update Admin User
-- This script can be run directly in your PostgreSQL database

-- Option 1: Update an existing user to admin role
-- Replace 'YOUR_PHONE_NUMBER' with the actual phone number
UPDATE users 
SET role = 'admin', 
    is_active = true 
WHERE phone_number = 'YOUR_PHONE_NUMBER';

-- Option 2: Check if the update was successful
SELECT id, phone_number, name, role, is_active 
FROM users 
WHERE phone_number = 'YOUR_PHONE_NUMBER';

-- Option 3: List all admin users
SELECT id, phone_number, name, role, is_active, created_at 
FROM users 
WHERE role = 'admin';

-- Option 4: Create a new admin user (if you have the hashed password)
-- Note: You'll need to hash the password first using the Python script
-- This is just a template
/*
INSERT INTO users (
    id,
    phone_number,
    hashed_password,
    name,
    role,
    is_active,
    preferred_language,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '+919876543210',
    'YOUR_HASHED_PASSWORD_HERE',
    'Admin User',
    'admin',
    true,
    'en',
    NOW(),
    NOW()
);
*/
