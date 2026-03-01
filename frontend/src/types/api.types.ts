export interface ApiResponse<T> {
    data: T;
    message?: string;
    timestamp: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
}

export interface ValidationError {
    field: string;
    message: string;
}
