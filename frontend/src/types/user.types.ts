/**
 * User interface matching backend UserResponse schema
 */
export interface User {
    id: string;
    phone_number: string;
    preferred_language: string;
    name: string | null;
    role: UserRole;
    is_active: boolean;
    location_lat: number | null;
    location_lng: number | null;
    location_address: string | null;
    district: string | null;
    state: string | null;
}

export type UserRole = 'user' | 'admin';

/**
 * Extended user profile with additional frontend-specific fields
 */
export interface UserProfile extends User {
    favorite_mandis: string[];
    bookmarked_schemes: string[];
}
