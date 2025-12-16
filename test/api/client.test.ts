import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { ApiClient } from "../../src/api/client";
import { StaticAuthProvider } from "../../src/auth/providers";
import { IAuthProvider, IApiCallParams, IApiCallResult } from "../../src/types";
import { logger } from "../../src/utils/logger";

// Mock dependencies
jest.mock("axios");
jest.mock("../../src/utils/logger");
jest.mock("../../src/auth/providers");

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe("ApiClient", () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;
  let mockAuthProvider: jest.Mocked<IAuthProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup axios instance mock
    mockAxiosInstance = {
      create: jest.fn(),
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn() as jest.MockedFunction<any>,
          eject: jest.fn(),
          clear: jest.fn(),
        },
        response: {
          use: jest.fn() as jest.MockedFunction<any>,
          eject: jest.fn(),
          clear: jest.fn(),
        },
      },
      defaults: {},
    } as any;

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError.mockImplementation(
      (error): error is AxiosError => {
        return error && typeof error === "object" && "isAxiosError" in error;
      },
    );

    // Setup auth provider mock
    mockAuthProvider = {
      getAuthHeaders: jest.fn(),
      handleAuthError: jest.fn(),
    };
  });

  describe("constructor", () => {
    it("should create instance with base URL and default auth", () => {
      apiClient = new ApiClient("https://api.example.com");

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://api.example.com",
        timeout: 30000,
        validateStatus: expect.any(Function),
      });
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        "Created API client for base URL: https://api.example.com",
      );
    });

    it("should remove trailing slash from base URL", () => {
      apiClient = new ApiClient("https://api.example.com/");

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://api.example.com",
        timeout: 30000,
        validateStatus: expect.any(Function),
      });
    });

    it("should use provided auth provider", () => {
      apiClient = new ApiClient("https://api.example.com", mockAuthProvider);

      expect(apiClient).toBeDefined();
      // Auth provider should be stored internally
    });

    it("should create StaticAuthProvider when headers provided", () => {
      const headers = { Authorization: "Bearer token123" };
      apiClient = new ApiClient("https://api.example.com", undefined, headers);

      expect(StaticAuthProvider).toHaveBeenCalledWith(headers);
    });

    it("should create empty StaticAuthProvider when no auth provided", () => {
      apiClient = new ApiClient("https://api.example.com");

      expect(StaticAuthProvider).toHaveBeenCalledWith({});
    });
  });

  describe("executeApiCall", () => {
    beforeEach(() => {
      mockAuthProvider.getAuthHeaders.mockResolvedValue({
        Authorization: "Bearer token",
      });
      apiClient = new ApiClient("https://api.example.com", mockAuthProvider);
    });

    it("should successfully execute GET request", async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: "OK",
        data: { message: "success" },
        headers: { "content-type": "application/json" },
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const params: IApiCallParams = {
        toolId: "GET::api__users",
        parameters: { limit: 10 },
        headers: { Accept: "application/json" },
      };

      const result = await apiClient.executeApiCall(params);

      expect(result).toEqual({
        success: true,
        data: { message: "success" },
        statusCode: 200,
        headers: { "content-type": "application/json" },
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "get",
        url: "/api/users",
        params: { limit: 10 },
        headers: { Accept: "application/json" },
      });
    });

    it("should successfully execute POST request with body", async () => {
      const mockResponse: AxiosResponse = {
        status: 201,
        statusText: "Created",
        data: { id: 123, name: "John" },
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const params: IApiCallParams = {
        toolId: "POST::api__users",
        parameters: {
          body: { name: "John", email: "john@example.com" },
        },
      };

      const result = await apiClient.executeApiCall(params);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 123, name: "John" });
      expect(result.statusCode).toBe(201);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "post",
        url: "/api/users",
        data: { name: "John", email: "john@example.com" },
        headers: { "Content-Type": "application/json" },
      });
    });

    it("should handle path parameters", async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: "OK",
        data: { id: 123 },
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const params: IApiCallParams = {
        toolId: "GET::api__users__---id",
        parameters: { id: 123, include: "profile" },
      };

      const result = await apiClient.executeApiCall(params);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "get",
        url: "/api/users/123",
        params: { include: "profile" },
      });
    });

    it("should handle HTTP error responses", async () => {
      const mockResponse: AxiosResponse = {
        status: 404,
        statusText: "Not Found",
        data: { error: "User not found" },
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const params: IApiCallParams = {
        toolId: "GET::api__users__999",
        parameters: {},
      };

      const result = await apiClient.executeApiCall(params);

      expect(result).toEqual({
        success: false,
        data: { error: "User not found" },
        statusCode: 404,
        headers: {},
        error: "HTTP 404: Not Found - User not found",
      });
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network Error");
      (networkError as any).isAxiosError = true;
      mockAxiosInstance.request.mockRejectedValue(networkError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const params: IApiCallParams = {
        toolId: "GET::api__users",
        parameters: {},
      };

      const result = await apiClient.executeApiCall(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network Error");
    });

    it("should handle authentication errors with retry", async () => {
      const authError = new Error("Unauthorized") as AxiosError;
      (authError as any).isAxiosError = true;
      authError.response = {
        status: 401,
        statusText: "Unauthorized",
        data: {},
        headers: {},
        config: {} as any,
      };

      const successResponse: AxiosResponse = {
        status: 200,
        statusText: "OK",
        data: { message: "success" },
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request
        .mockRejectedValueOnce(authError)
        .mockResolvedValueOnce(successResponse);

      mockedAxios.isAxiosError.mockReturnValue(true);

      // Mock isAuthError function
      jest.doMock("../../src/auth/providers", () => ({
        StaticAuthProvider: jest.fn(),
        isAuthError: jest.fn().mockReturnValue(true),
      }));

      const { isAuthError } = require("../../src/auth/providers");
      isAuthError.mockReturnValue(true);

      mockAuthProvider.handleAuthError.mockResolvedValue(true);

      const params: IApiCallParams = {
        toolId: "GET::api__users",
        parameters: {},
      };

      const result = await apiClient.executeApiCall(params);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: "success" });
      expect(mockAuthProvider.handleAuthError).toHaveBeenCalledWith(authError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    it("should fail when auth provider refuses retry", async () => {
      const authError = new Error("Unauthorized") as AxiosError;
      (authError as any).isAxiosError = true;
      authError.response = {
        status: 401,
        statusText: "Unauthorized",
        data: {},
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockRejectedValue(authError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const { isAuthError } = require("../../src/auth/providers");
      isAuthError.mockReturnValue(true);

      mockAuthProvider.handleAuthError.mockResolvedValue(false);

      const params: IApiCallParams = {
        toolId: "GET::api__users",
        parameters: {},
      };

      const result = await apiClient.executeApiCall(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it("should handle auth provider errors", async () => {
      const authError = new Error("Unauthorized") as AxiosError;
      (authError as any).isAxiosError = true;
      authError.response = {
        status: 401,
        statusText: "Unauthorized",
        data: {},
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockRejectedValue(authError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const { isAuthError } = require("../../src/auth/providers");
      isAuthError.mockReturnValue(true);

      mockAuthProvider.handleAuthError.mockRejectedValue(
        new Error("Auth failed"),
      );

      const params: IApiCallParams = {
        toolId: "GET::api__users",
        parameters: {},
      };

      const result = await apiClient.executeApiCall(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Auth failed");
      expect(result.statusCode).toBe(401);
    });

    it("should handle unexpected errors", async () => {
      const unexpectedError = "Something went wrong";
      mockAxiosInstance.request.mockRejectedValue(unexpectedError);

      const params: IApiCallParams = {
        toolId: "GET::api__users",
        parameters: {},
      };

      const result = await apiClient.executeApiCall(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error occurred");
    });
  });

  describe("buildRequestConfig", () => {
    beforeEach(() => {
      apiClient = new ApiClient("https://api.example.com", mockAuthProvider);
    });

    it("should handle query parameters", async () => {
      const params: IApiCallParams = {
        toolId: "GET::api__users",
        parameters: { limit: 10, offset: 20, sort: "name" },
      };

      await apiClient.executeApiCall(params);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "get",
        url: "/api/users",
        params: { limit: 10, offset: 20, sort: "name" },
      });
    });

    it("should encode path parameters", async () => {
      const params: IApiCallParams = {
        toolId: "GET::api__users__---id__posts__---postId",
        parameters: {
          id: "user@example.com",
          postId: "hello world",
          limit: 5,
        },
      };

      await apiClient.executeApiCall(params);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "get",
        url: "/api/users/user%40example.com/posts/hello%20world",
        params: { limit: 5 },
      });
    });

    it("should handle body data for POST requests", async () => {
      const params: IApiCallParams = {
        toolId: "POST::api__users",
        parameters: {
          body: { name: "John", age: 30 },
        },
      };

      await apiClient.executeApiCall(params);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "post",
        url: "/api/users",
        data: { name: "John", age: 30 },
        headers: { "Content-Type": "application/json" },
      });
    });

    it("should preserve existing content-type header", async () => {
      const params: IApiCallParams = {
        toolId: "POST::api__users",
        parameters: { body: "name=John&age=30" },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      };

      await apiClient.executeApiCall(params);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "post",
        url: "/api/users",
        data: "name=John&age=30",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    });

    it("should skip null and undefined parameters", async () => {
      const params: IApiCallParams = {
        toolId: "GET::api__users",
        parameters: {
          limit: 10,
          offset: null,
          sort: undefined,
          filter: "active",
        },
      };

      await apiClient.executeApiCall(params);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "get",
        url: "/api/users",
        params: { limit: 10, filter: "active" },
      });
    });
  });

  describe("testConnection", () => {
    beforeEach(() => {
      apiClient = new ApiClient("https://api.example.com", mockAuthProvider);
    });

    it("should return true for successful connection", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        statusText: "OK",
        data: {},
        headers: {},
        config: {} as any,
      });

      const result = await apiClient.testConnection();

      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/");
    });

    it("should return true for client errors (4xx)", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 404,
        statusText: "Not Found",
        data: {},
        headers: {},
        config: {} as any,
      });

      const result = await apiClient.testConnection();

      expect(result).toBe(true); // Still reachable
    });

    it("should return false for server errors (5xx)", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 500,
        statusText: "Internal Server Error",
        data: {},
        headers: {},
        config: {} as any,
      });

      const result = await apiClient.testConnection();

      expect(result).toBe(false);
    });

    it("should return false for network errors", async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error("Network Error"));

      const result = await apiClient.testConnection();

      expect(result).toBe(false);
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        "Connection test failed: Network Error",
      );
    });
  });

  describe("authentication interceptor", () => {
    beforeEach(() => {
      mockAuthProvider.getAuthHeaders.mockResolvedValue({
        Authorization: "Bearer token123",
      });
      apiClient = new ApiClient("https://api.example.com", mockAuthProvider);
    });

    it("should call auth interceptor on request", () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();

      const interceptorFunction = (
        mockAxiosInstance.interceptors.request.use as jest.MockedFunction<any>
      ).mock.calls[0][0];
      expect(typeof interceptorFunction).toBe("function");
    });

    it("should add auth headers to request", async () => {
      const interceptorFunction = (
        mockAxiosInstance.interceptors.request.use as jest.MockedFunction<any>
      ).mock.calls[0][0];

      const config = { headers: {} };
      const result = await interceptorFunction(config);

      expect(mockAuthProvider.getAuthHeaders).toHaveBeenCalled();
      expect(result.headers).toEqual({ Authorization: "Bearer token123" });
    });

    it("should handle auth header errors", async () => {
      mockAuthProvider.getAuthHeaders.mockRejectedValue(
        new Error("Token expired"),
      );

      const interceptorFunction = (
        mockAxiosInstance.interceptors.request.use as jest.MockedFunction<any>
      ).mock.calls[0][0];
      const config = { headers: {} };

      await expect(interceptorFunction(config)).rejects.toThrow(
        "Token expired",
      );
      expect(mockedLogger.error).toHaveBeenCalledWith(
        "Failed to get auth headers: Token expired",
      );
    });
  });

  describe("response processing", () => {
    beforeEach(() => {
      apiClient = new ApiClient("https://api.example.com", mockAuthProvider);
    });

    it("should extract error message from response data", async () => {
      const mockResponse: AxiosResponse = {
        status: 400,
        statusText: "Bad Request",
        data: { message: "Invalid input data" },
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const params: IApiCallParams = {
        toolId: "POST::api__users",
        parameters: { body: { name: "" } },
      };

      const result = await apiClient.executeApiCall(params);

      expect(result.error).toBe("HTTP 400: Bad Request - Invalid input data");
    });

    it("should extract error from 'error' field in response", async () => {
      const mockResponse: AxiosResponse = {
        status: 422,
        statusText: "Unprocessable Entity",
        data: { error: "Validation failed" },
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const params: IApiCallParams = {
        toolId: "POST::api__users",
        parameters: { body: { email: "invalid" } },
      };

      const result = await apiClient.executeApiCall(params);

      expect(result.error).toBe(
        "HTTP 422: Unprocessable Entity - Validation failed",
      );
    });

    it("should handle response without error details", async () => {
      const mockResponse: AxiosResponse = {
        status: 403,
        statusText: "Forbidden",
        data: "Access denied",
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const params: IApiCallParams = {
        toolId: "GET::api__admin",
        parameters: {},
      };

      const result = await apiClient.executeApiCall(params);

      expect(result.error).toBe("HTTP 403: Forbidden");
    });
  });
});
