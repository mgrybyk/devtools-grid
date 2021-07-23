module.exports = {
    roots: ['<rootDir>/test'],
    testMatch: ['**/?(*.)+(spec|test).+(ts|tsx|js)'],
    preset: 'ts-jest',
    coverageDirectory: './coverage/',
    collectCoverage: false,
    coverageThreshold: {
        global: {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
        },
    },
    testEnvironment: 'node',
    coveragePathIgnorePatterns: ['/__fixtures__/'],
    testPathIgnorePatterns: ['/__fixtures__/'],
}
