export enum ApiResponseStatus {
	SUCCESS = "success",
	ERROR = "error",
}

export interface ApiResponseError {
	message: string;
	details?: Record<string, string>;
}

export interface ApiPaginatedResponse<T> {
	total: number;
	limit: number;
	offset: number;
	items?: T[];
}
