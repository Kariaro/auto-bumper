module.exports = {
  preset: "ts-jest/presets/js-with-ts",
  testEnvironment: "jest-environment-node",
  moduleNameMapper: {
    "@src/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(t|j)sx?$": "ts-jest",
  },
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/build/"],
  globalTeardown: "<rootDir>/tests/teardown.ts",
};
