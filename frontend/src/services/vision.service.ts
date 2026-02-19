/**
 * Vision Service for crop disease detection and treatment recommendations
 */

import apiService from './api';
import type {
    DiseaseAnalysisResponse,
    ImageValidationResult,
    ComprehensiveAnalysisResponse,
    SupportedFormatsResponse,
    DiseaseCategoriesResponse,
    VisionHealthResponse,
    TreatmentPlan,
} from '@/types/vision.types';

class VisionService {
    /**
     * Analyze crop image for disease identification via file upload
     * @param image - Image file to analyze
     * @param options - Optional analysis parameters
     * @returns Disease analysis result
     */
    async analyzeImage(
        image: File,
        options?: {
            cropHint?: string;
            locationContext?: string;
            additionalContext?: string;
        }
    ): Promise<DiseaseAnalysisResponse> {
        const formData = new FormData();
        formData.append('image', image);

        if (options?.cropHint) {
            formData.append('crop_hint', options.cropHint);
        }
        if (options?.locationContext) {
            formData.append('location_context', options.locationContext);
        }
        if (options?.additionalContext) {
            formData.append('additional_context', options.additionalContext);
        }

        return apiService.post<DiseaseAnalysisResponse>('/vision/analyze/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }

    /**
     * Analyze crop image using base64 encoded data
     * @param base64Image - Base64 encoded image data
     * @param options - Optional analysis parameters
     * @returns Disease analysis result
     */
    async analyzeImageBase64(
        base64Image: string,
        options?: {
            cropHint?: string;
            locationContext?: string;
            additionalContext?: string;
        }
    ): Promise<DiseaseAnalysisResponse> {
        return apiService.post<DiseaseAnalysisResponse>('/vision/analyze/base64', {
            image_base64: base64Image,
            crop_hint: options?.cropHint,
            location_context: options?.locationContext,
            additional_context: options?.additionalContext,
        });
    }

    /**
     * Perform comprehensive analysis with detailed treatment recommendations
     * @param image - Image file to analyze
     * @param options - Optional analysis parameters
     * @returns Comprehensive analysis with treatment plan
     */
    async analyzeComprehensive(
        image: File,
        options?: {
            cropHint?: string;
            locationContext?: string;
            additionalContext?: string;
            userLocation?: string;
        }
    ): Promise<ComprehensiveAnalysisResponse> {
        const formData = new FormData();
        formData.append('image', image);

        if (options?.cropHint) {
            formData.append('crop_hint', options.cropHint);
        }
        if (options?.locationContext) {
            formData.append('location_context', options.locationContext);
        }
        if (options?.additionalContext) {
            formData.append('additional_context', options.additionalContext);
        }
        if (options?.userLocation) {
            formData.append('user_location', options.userLocation);
        }

        return apiService.post<ComprehensiveAnalysisResponse>(
            '/vision/analyze/comprehensive',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
    }

    /**
     * Validate image file before analysis
     * @param image - Image file to validate
     * @returns Validation result
     */
    async validateImage(image: File): Promise<ImageValidationResult> {
        const formData = new FormData();
        formData.append('image', image);

        return apiService.post<ImageValidationResult>('/vision/validate', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }

    /**
     * Get detailed treatment information for a specific disease
     * @param diseaseName - Name of the disease
     * @param cropType - Optional crop type
     * @returns Detailed treatment information
     */
    async getDetailedTreatment(
        diseaseName: string,
        cropType?: string
    ): Promise<{ success: boolean; disease_name: string; crop_type?: string; treatment_info: unknown }> {
        return apiService.post('/vision/treatment/detailed', {
            disease_name: diseaseName,
            crop_type: cropType,
        });
    }

    /**
     * Generate treatment plan for a known disease
     * @param diseaseName - Name of the disease
     * @param options - Optional parameters
     * @returns Treatment plan
     */
    async generateTreatmentPlan(
        diseaseName: string,
        options?: {
            cropType?: string;
            severity?: string;
            userLocation?: string;
        }
    ): Promise<{ success: boolean; disease_name: string; crop_type?: string; treatment_plan: TreatmentPlan }> {
        const formData = new FormData();
        formData.append('disease_name', diseaseName);

        if (options?.cropType) {
            formData.append('crop_type', options.cropType);
        }
        if (options?.severity) {
            formData.append('severity', options.severity);
        }
        if (options?.userLocation) {
            formData.append('user_location', options.userLocation);
        }

        return apiService.post('/vision/treatment/plan', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }

    /**
     * Get list of supported image formats and constraints
     * @returns Supported formats information
     */
    async getSupportedFormats(): Promise<SupportedFormatsResponse> {
        return apiService.get<SupportedFormatsResponse>('/vision/supported-formats');
    }

    /**
     * Get disease categories and common symptoms
     * @returns Disease categories information
     */
    async getDiseaseCategories(): Promise<DiseaseCategoriesResponse> {
        return apiService.get<DiseaseCategoriesResponse>('/vision/disease-categories');
    }

    /**
     * Check vision service health
     * @returns Health status
     */
    async healthCheck(): Promise<VisionHealthResponse> {
        return apiService.get<VisionHealthResponse>('/vision/health');
    }

    /**
     * Validate image file client-side before upload
     * @param file - File to validate
     * @returns Validation result with error message if invalid
     */
    validateImageClientSide(file: File): { valid: boolean; error?: string } {
        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return {
                valid: false,
                error: `Invalid file type: ${file.type}. Supported formats: JPEG, PNG, WebP`,
            };
        }

        // Check file size (10MB limit)
        const maxSizeMB = 10;
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSizeMB) {
            return {
                valid: false,
                error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
            };
        }

        return { valid: true };
    }

    /**
     * Convert file to base64 string
     * @param file - File to convert
     * @returns Promise resolving to base64 string
     */
    async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert file to base64'));
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Create object URL for image preview
     * @param file - Image file
     * @returns Object URL
     */
    createImagePreviewUrl(file: File): string {
        return URL.createObjectURL(file);
    }

    /**
     * Revoke object URL to free memory
     * @param url - Object URL to revoke
     */
    revokeImagePreviewUrl(url: string): void {
        URL.revokeObjectURL(url);
    }
}

// Export singleton instance
const visionService = new VisionService();
export default visionService;
