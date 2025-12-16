/**
 * Test type declarations
 */

declare global {
  function createMockOpenAPISpec(): any;
  function createMockConfig(): any;

  namespace jest {
    interface Matchers<R> {
      toBeValidToolId(): R;
      toBeValidToolName(): R;
    }
  }
}

export {};
