/**
 * Type definitions for Vision Service (Disease Detection)
 */

export interface DiseaseIdentification {
    disease_name: string;
    confidence_score: number;
    confidence_level: 'low' | 'medium' | 'high';
    crop_type?: string;
    affected_parts?: string[];
    severity?: string;
    description?: string;
}

export interface TreatmentRecommendation {
    treatment_type: string;
    active_ingredients?: string[];
    dosage?: string;
    application_method?: string;
    timing?: string;
    precautions?: string[];
    cost_estimate?: string;
}

export interface DiseaseAnalysis {
    image_id: string;
    timestamp: string;
    crop_type?: string;
    diseases: DiseaseIdentification[];
    primary_disease: DiseaseIdentification | null;
    treatment_recommendations: TreatmentRecommendation[];
    prevention_strategies: string[];
    confidence_summary: string;
    processing_time: number;
    model_used: string;
    metadata?: Record<string, unknown>;
}

export interface DiseaseAnalysisResponse {
    success: boolean;
    analysis?: DiseaseAnalysis;
    error?: string;
    processing_time?: number;
}

export interface ImageValidationResult {
    is_valid: boolean;
    error_message?: string;
    format?: string;
    size?: [number, number];
    file_size_mb?: number;
}

export interface TreatmentPlan {
    disease_name: string;
    crop_type?: string;
    severity?: string;
    immediate_actions?: string[];
    chemical_treatments?: TreatmentRecommendation[];
    organic_treatments?: TreatmentRecommendation[];
    preventive_measures?: string[];
    estimated_recovery_time?: string;
    sources?: string[];
}

export interface ComprehensiveAnalysisResponse {
    success: boolean;
    disease_analysis: {
        image_id: string;
        timestamp: string;
        crop_type?: string;
        primary_disease: DiseaseIdentification | null;
        all_diseases: Array<{
            disease_name: string;
            confidence_score: number;
            confidence_level: string;
        }>;
        processing_time: number;
        model_used: string;
    };
    treatment_plan: TreatmentPlan;
}

export interface SupportedFormatsResponse {
    supported_formats: string[];
    max_file_size_mb: number;
    max_dimensions: [number, number];
    recommendations: string[];
    optimal_conditions: string[];
}

export interface DiseaseCategory {
    description: string;
    common_symptoms: string[];
    examples: string[];
}

export interface DiseaseCategoriesResponse {
    disease_categories: Record<string, DiseaseCategory>;
    identification_tips: string[];
}

export interface VisionHealthResponse {
    status: string;
    model: string;
    response_time?: string;
    test_response?: string;
    error?: string;
}
