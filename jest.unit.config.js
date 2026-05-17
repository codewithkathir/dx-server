const baseConfig = require("./jest.config.js");

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  testMatch: ["**/tests/unit/**/*.test.ts"],
};
