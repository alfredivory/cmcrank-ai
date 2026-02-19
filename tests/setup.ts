import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.CMC_API_KEY = 'test-cmc-key';
process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.ADMIN_API_SECRET = 'test-admin-secret';
process.env.INITIAL_ADMINS = 'alex.shevchenko@defuse.org,alfred.ivory@defuse.org';
process.env.RESEARCH_CREDITS_PER_DAY = '5';
process.env.GOOGLE_CLIENT_ID = 'test-google-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
process.env.GITHUB_CLIENT_ID = 'test-github-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
process.env.LOG_LEVEL = 'error'; // Suppress logs in tests
