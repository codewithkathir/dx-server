const baseConfig = require("./jest.config.js");

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  testMatch: ["**/tests/integration/**/*.test.ts"],
  globalSetup: "<rootDir>/tests/global-setup.ts",
  globalTeardown: "<rootDir>/tests/global-teardown.ts",
  setupFilesAfterEnv: ["<rootDir>/tests/teardown-after-env.ts"],
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 55,
      lines: 55,
      statements: 55,
    },
  },
};
