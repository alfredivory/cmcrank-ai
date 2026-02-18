import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.CMC_API_KEY = 'test-cmc-key';
process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.LOG_LEVEL = 'error'; // Suppress logs in tests
