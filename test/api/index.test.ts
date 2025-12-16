import { ApiClient } from "../../src/api/client";
import defaultExport from "../../src/api/index";
import * as namedExports from "../../src/api/index";

describe("API Index", () => {
  it("should export ApiClient as named export", () => {
    expect(namedExports.ApiClient).toBeDefined();
    expect(namedExports.ApiClient).toBe(ApiClient);
  });

  it("should export ApiClient as default export", () => {
    expect(defaultExport).toBeDefined();
    expect(defaultExport).toBe(ApiClient);
  });

  it("should have consistent exports", () => {
    expect(namedExports.ApiClient).toBe(defaultExport);
  });
});
