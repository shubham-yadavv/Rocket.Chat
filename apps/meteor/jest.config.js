module.exports = {
	testEnvironment: 'node',
	testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
	transform: {
		'.+\\.ts': 'ts-jest',
	},
};
