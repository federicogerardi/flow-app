export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
    retryable: boolean;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
