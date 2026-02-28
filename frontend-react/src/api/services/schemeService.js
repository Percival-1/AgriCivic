import axios from '../axios';
import BaseService from './BaseService';

/**
 * Scheme Service
 * Handles all government scheme API calls
 * Redesigned for auto-load based on user profile
 */
class SchemeService extends BaseService {
    constructor() {
        super();
        this.baseURL = '/api/v1/schemes';
    }

    /**
     * Get schemes for user (auto-load on page mount)
     * NEW: GET /api/v1/schemes/for-user?user_id=X&state=Y&language=Z
     */
    async getSchemesForUser(userId, state, language = 'en') {
        const params = {
            user_id: userId || 'anonymous',
            state: state || null,
            language: language || 'en',
            limit: 20
        };

        const response = await axios.get(`${this.baseURL}/for-user`, { params });
        return response.data;
    }

    /**
     * Search schemes
     * POST /api/v1/schemes/search with body: { query, user_profile?, top_k? }
     */
    async searchSchemes(query, userProfile = null) {
        const requestBody = {
            query: query || 'government schemes for farmers',
            top_k: 20,
            user_profile: userProfile ? this._buildUserProfile(userProfile) : null
        };

        const response = await axios.post(`${this.baseURL}/search`, requestBody);
        return response.data;
    }

    /**
     * Get scheme details
     * POST /api/v1/schemes/details with body: { scheme_name, user_profile? }
     */
    async getSchemeDetails(schemeId, userProfile = null) {
        const requestBody = {
            scheme_name: schemeId,
            user_profile: userProfile ? this._buildUserProfile(userProfile) : null
        };

        const response = await axios.post(`${this.baseURL}/details`, requestBody);
        return response.data;
    }

    /**
     * Prepare chat context for scheme
     * NEW: POST /api/v1/schemes/{scheme_id}/chat-context
     */
    async prepareChatContext(schemeId, userProfile = null) {
        const requestBody = {
            user_profile: userProfile ? this._buildUserProfile(userProfile) : null
        };

        // URL encode the scheme ID to handle special characters
        const encodedSchemeId = encodeURIComponent(schemeId);

        const response = await axios.post(`${this.baseURL}/${encodedSchemeId}/chat-context`, requestBody);
        return response.data;
    }

    /**
     * Check eligibility for a scheme
     * POST /api/v1/schemes/eligibility/check with body: { scheme_name, user_profile }
     */
    async checkEligibility(schemeId, userProfile) {
        const requestBody = {
            scheme_name: schemeId,
            user_profile: this._buildUserProfile(userProfile)
        };

        const response = await axios.post(`${this.baseURL}/eligibility/check`, requestBody);
        return response.data;
    }

    /**
     * Helper: Build user profile object
     */
    _buildUserProfile(userProfile) {
        if (!userProfile) return null;

        return {
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
            language: userProfile.language || 'en',
            additional_attributes: null
        };
    }
}

export default new SchemeService();
