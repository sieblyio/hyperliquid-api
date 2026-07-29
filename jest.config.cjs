/** @type {import('jest').Config} */
module.exports = {
  bail: false,
  clearMocks: true,
  collectCoverage: false,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  maxWorkers: '1',
  moduleDirectories: ['node_modules', 'src', 'test'],
  moduleFileExtensions: [
    'js',
    'mjs',
    'cjs',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  testTimeout: 20000,
  transform: {
    '^.+\\.tsx?$': '<rootDir>/test/config/jest-transformer.cjs',
  },
  verbose: true,
};
