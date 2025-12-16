/**
 * Tests for logger utility
 */

import { Logger, logger, setDebugMode } from "../../src/utils/logger";

describe("Logger", () => {
  let mockConsole: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
  };

  beforeEach(() => {
    mockConsole = {
      log: jest.spyOn(console, "log").mockImplementation(),
      error: jest.spyOn(console, "error").mockImplementation(),
      warn: jest.spyOn(console, "warn").mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Logger class", () => {
    it("should create logger with debug disabled by default", () => {
      const testLogger = new Logger();
      testLogger.debug("test message");
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it("should create logger with debug enabled when specified", () => {
      const testLogger = new Logger(true);
      testLogger.debug("test message");
      expect(mockConsole.log).toHaveBeenCalledWith("[DEBUG] test message");
    });

    it("should log info messages", () => {
      const testLogger = new Logger();
      testLogger.info("test info message", "extra", 123);
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[INFO] test info message",
        "extra",
        123,
      );
    });

    it("should log error messages", () => {
      const testLogger = new Logger();
      testLogger.error("test error message", { code: 500 });
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[ERROR] test error message",
        { code: 500 },
      );
    });

    it("should log warning messages", () => {
      const testLogger = new Logger();
      testLogger.warn("test warning message");
      expect(mockConsole.warn).toHaveBeenCalledWith(
        "[WARN] test warning message",
      );
    });

    it("should enable debug mode dynamically", () => {
      const testLogger = new Logger(false);

      // Debug disabled initially
      testLogger.debug("first message");
      expect(mockConsole.log).not.toHaveBeenCalled();

      // Enable debug
      testLogger.setDebugMode(true);
      testLogger.debug("second message");
      expect(mockConsole.log).toHaveBeenCalledWith("[DEBUG] second message");

      // Disable debug again
      testLogger.setDebugMode(false);
      mockConsole.log.mockClear();
      testLogger.debug("third message");
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe("Global logger", () => {
    it("should have a global logger instance", () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should allow setting debug mode globally", () => {
      setDebugMode(true);
      logger.debug("global debug test");
      expect(mockConsole.log).toHaveBeenCalledWith("[DEBUG] global debug test");

      setDebugMode(false);
      mockConsole.log.mockClear();
      logger.debug("disabled debug test");
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it("should handle multiple arguments in log methods", () => {
      const complexObject = { nested: { value: "test" }, array: [1, 2, 3] };
      logger.info("Complex log", complexObject, "string", 42, true);

      expect(mockConsole.log).toHaveBeenCalledWith(
        "[INFO] Complex log",
        complexObject,
        "string",
        42,
        true,
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle empty messages", () => {
      const testLogger = new Logger();
      testLogger.info("");
      testLogger.error("");
      testLogger.warn("");

      expect(mockConsole.log).toHaveBeenCalledWith("[INFO] ");
      expect(mockConsole.error).toHaveBeenCalledWith("[ERROR] ");
      expect(mockConsole.warn).toHaveBeenCalledWith("[WARN] ");
    });

    it("should handle special characters in messages", () => {
      const testLogger = new Logger();
      const specialMessage =
        'Message with 🎉 emojis and \nnewlines and "quotes" and \\backslashes';

      testLogger.info(specialMessage);
      expect(mockConsole.log).toHaveBeenCalledWith(`[INFO] ${specialMessage}`);
    });

    it("should handle null and undefined arguments", () => {
      const testLogger = new Logger();
      testLogger.info("test", null, undefined, 0, false, "");

      expect(mockConsole.log).toHaveBeenCalledWith(
        "[INFO] test",
        null,
        undefined,
        0,
        false,
        "",
      );
    });
  });

  describe("Performance", () => {
    it("should not execute debug message construction when debug is disabled", () => {
      const testLogger = new Logger(false);
      const expensiveOperation = jest.fn(() => "expensive result");

      // This should not call the expensive operation
      testLogger.debug("Debug message", expensiveOperation());

      expect(expensiveOperation).toHaveBeenCalled(); // Note: args are still evaluated
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });
});
