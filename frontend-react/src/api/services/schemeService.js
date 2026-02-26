import axios from '../axios';
import BaseService from './BaseService';

/**
 * Scheme Service
 * Handles all government scheme API calls
 * Requirements: 9.1-9.7
 */
class SchemeService extends BaseService {
    constructor() {
        super();
        this.baseURL = '/api/v1/schemes';
    }

    /**
     * Search schemes
     * Backend expects POST /api/v1/schemes/search with body: { query, user_profile?, scheme_types?, top_k? }
     */
    async searchSchemes(query, filters = {}) {
        const requestBody = {
            query: query || '',
            top_k: 20,
            scheme_types: filters.type ? [filters.type] : null,
            user_profile: null // Can be enhanced later with user profile
        };

        const response = await axios.post(`${this.baseURL}/search`, requestBody);
        return response.data;
    }

    /**
     * Get scheme details
     * Backend expects POST /api/v1/schemes/details with body: { scheme_name, user_profile? }
     */
    async getSchemeDetails(schemeId) {
        const requestBody = {
            scheme_name: schemeId,
            user_profile: null
        };

        const response = await axios.post(`${this.baseURL}/details`, requestBody);
        return response.data;
    }

    /**
     * Get personalized scheme recommendations
     * Backend expects POST /api/v1/schemes/recommendations with body: { user_profile, limit? }
     */
    async getRecommendations(userProfile = null) {
        // Build user profile from provided data
        const profileData = userProfile ? {
            user_id: userProfile.id || 'anonymous',
            location: (userProfile.state || userProfile.district || userProfile.location_address) ? {
                state: userProfile.state || '',
                district: userProfile.district || '',
                address: userProfile.location_address || userProfile.location || '',
                latitude: userProfile.location_lat || null,
                longitude: userProfile.location_lng || null
            } : null,
            crops: userProfile.crops || null,
            land_size_hectares: userProfile.land_size || userProfile.landSize || null,
            farmer_category: userProfile.farmer_category || 'small',
            annual_income: userProfile.income || null,
            age: userProfile.age || null,
            gender: userProfile.gender || null,
            caste_category: userProfile.caste_category || null,
            has_bank_account: true,
            has_aadhaar: true,
            additional_attributes: null
        } : {
            user_id: 'anonymous',
            location: null,
            crops: null,
            land_size_hectares: null,
            farmer_category: 'small',
            annual_income: null,
            age: null,
            gender: null,
            caste_category: null,
            has_bank_account: true,
            has_aadhaar: true,
            additional_attributes: null
        };

        const requestBody = {
            user_profile: profileData,
            limit: 10
        };

        const response = await axios.post(`${this.baseURL}/recommendations`, requestBody);
        return response.data;
    }

    /**
     * Check eligibility for a scheme
     * Backend expects POST /api/v1/schemes/eligibility/check with body: { scheme_name, user_profile }
     */
    async checkEligibility(schemeId, userProfile) {
        // Build user profile
        const profileData = {
            user_id: userProfile.id || 'anonymous',
            location: (userProfile.state || userProfile.district || userProfile.location_address) ? {
                state: userProfile.state || '',
                district: userProfile.district || '',
                address: userProfile.location_address || userProfile.location || '',
                latitude: userProfile.location_lat || null,
                longitude: userProfile.location_lng || null
            } : null,
            crops: userProfile.crops || null,
            land_size_hectares: userProfile.land_size || userProfile.landSize || null,
            farmer_category: userProfile.farmer_category || 'small',
            annual_income: userProfile.income || null,
            age: userProfile.age || null,
            gender: userProfile.gender || null,
            caste_category: userProfile.caste_category || null,
            has_bank_account: true,
            has_aadhaar: true,
            additional_attributes: null
        };

        const requestBody = {
            scheme_name: schemeId,
            user_profile: profileData
        };

        const response = await axios.post(`${this.baseURL}/eligibility/check`, requestBody);
        return response.data;
    }
}

export default new SchemeService();
