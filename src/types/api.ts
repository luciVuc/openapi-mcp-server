/**
 * API call parameters
 */
export interface IApiCallParams {
  toolId: string;
  parameters: Record<string, any>;
  headers?: Record<string, string>;
}

/**
 * API call result
 */
export interface IApiCallResult {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
}
