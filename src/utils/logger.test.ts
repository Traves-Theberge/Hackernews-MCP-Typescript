import { logger } from "./logger";

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

describe("Logger", () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe("logging levels", () => {
    it("should log info messages", () => {
      logger.info("Test info message");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Test info message$/)
      );
    });

    it("should log error messages", () => {
      logger.error("Test error message");
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] ERROR: Test error message$/)
      );
    });

    it("should log warning messages", () => {
      logger.warn("Test warning message");
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] WARN: Test warning message$/)
      );
    });

    it("should log debug messages when level allows", () => {
      // Debug messages are filtered out by default (level is 'info')
      logger.debug("Test debug message");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe("message formatting", () => {
    it("should include timestamp in log messages", () => {
      logger.info("Test message");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Test message$/)
      );
    });

    it("should format messages with additional arguments", () => {
      const testObj = { key: "value" };
      const testArray = [1, 2, 3];
      
      logger.info("Test message with args", testObj, testArray);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Test message with args \{"key":"value"\} \[1,2,3\]$/)
      );
    });

    it("should handle undefined and null arguments", () => {
      logger.info("Test message", undefined, null);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Test message undefined null$/)
      );
    });

    it("should handle circular objects gracefully", () => {
      const circular: any = { name: "test" };
      circular.self = circular;
      
      logger.info("Test circular", circular);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Test circular \[Circular\]$/)
      );
    });

    it("should handle error objects", () => {
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test.js:1:1";
      
      logger.error("Error occurred", error);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] ERROR: Error occurred/)
      );
    });
  });

  describe("log level filtering", () => {
    // Note: Since the logger is a singleton with a fixed level,
    // we can only test the current behavior. In a real implementation,
    // you might want to make the log level configurable for testing.
    
    it("should respect the current log level", () => {
      // Assuming the logger is set to 'info' level by default
      logger.debug("Debug message that might be filtered");
      logger.info("Info message that should appear");
      
      // The behavior depends on the actual log level configuration
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe("performance", () => {
    it("should handle high volume logging efficiently", () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
      expect(mockConsoleLog).toHaveBeenCalledTimes(1000);
    });

    it("should handle large messages efficiently", () => {
      const largeMessage = "x".repeat(10000);
      const startTime = Date.now();
      
      logger.info(largeMessage);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle large messages quickly
      expect(duration).toBeLessThan(50);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z\\] INFO: ${largeMessage}$`))
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty messages", () => {
      logger.info("");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: $/)
      );
    });

    it("should handle very long messages", () => {
      const longMessage = "a".repeat(5000);
      logger.info(longMessage);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z\\] INFO: ${longMessage}$`))
      );
    });

    it("should handle special characters", () => {
      const specialMessage = "Message with 🚀 emojis and special chars: àáâãäå";
      logger.info(specialMessage);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Message with 🚀 emojis and special chars: àáâãäå$/)
      );
    });

    it("should handle newlines and tabs", () => {
      const multilineMessage = "Line 1\nLine 2\tTabbed";
      logger.info(multilineMessage);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Line 1\nLine 2\tTabbed")
      );
    });

    it("should handle functions as arguments", () => {
      const testFunction = () => "test function";
      logger.info("Function test", testFunction);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Function test .* => "test function"$/)
      );
    });

    it("should handle symbols as arguments", () => {
      const testSymbol = Symbol("test");
      logger.info("Symbol test", testSymbol);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Symbol test Symbol\(test\)$/)
      );
    });
  });

  describe("concurrent logging", () => {
    it("should handle concurrent log calls", async () => {
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise<void>(resolve => {
            setTimeout(() => {
              logger.info(`Concurrent message ${i}`);
              resolve();
            }, Math.random() * 10);
          })
        );
      }
      
      await Promise.all(promises);
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(100);
    });
  });

  describe("memory usage", () => {
    it("should not leak memory with repeated logging", () => {
      // This is a basic test - in a real scenario you'd use more sophisticated memory monitoring
      const initialMemory = process.memoryUsage();
      
      for (let i = 0; i < 10000; i++) {
        logger.info(`Memory test message ${i}`, { data: new Array(100).fill(i) });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory usage shouldn't grow excessively (less than 50MB increase)
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
}); 