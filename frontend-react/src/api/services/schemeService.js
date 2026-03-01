import axios from '../axios';
import BaseService from './BaseService';

/**
 * Scheme Service
 */
class SchemeService extends BaseService {
    constructor() {
        super();
        // 🔥 FIX: Removed /api from baseURL
        this.baseURL = '/v1/schemes';
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



    async searchSchemes(query, filters = {}) {
        const requestBody = {
            query: query || 'government schemes for farmers',
            top_k: 20,
            scheme_types: filters.type ? [filters.type] : null,
            user_profile: null
        };
        const response = await axios.post(`${this.baseURL}/search`, requestBody);
        return response.data;
    }

    async getSchemeDetails(schemeId) {
        const requestBody = { scheme_name: schemeId, user_profile: null };
        const response = await axios.post(`${this.baseURL}/details`, requestBody);
        return response.data;
    }

    async getRecommendations(userProfile = null) {
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
            user_id: 'anonymous', location: null, crops: null, land_size_hectares: null,
            farmer_category: 'small', annual_income: null, age: null, gender: null,
            caste_category: null, has_bank_account: true, has_aadhaar: true, additional_attributes: null
        };

        const requestBody = { user_profile: profileData, limit: 10 };
        const response = await axios.post(`${this.baseURL}/recommendations`, requestBody);
        return response.data;
    }

    async checkEligibility(schemeId, userProfile) {
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
            language: userProfile.language || 'en',
            additional_attributes: null
        };

        const requestBody = { scheme_name: schemeId, user_profile: profileData };
        const response = await axios.post(`${this.baseURL}/eligibility/check`, requestBody);
        return response.data;
    }
}

export default new SchemeService();