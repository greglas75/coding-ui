export default async function globalSetup() {
  const defaults: Record<string, string> = {
    VITE_OPENAI_API_KEY: 'test-openai-key',
    VITE_ANTHROPIC_API_KEY: 'test-anthropic-key',
    VITE_GOOGLE_GEMINI_API_KEY: 'test-gemini-key',
    VITE_GOOGLE_CSE_API_KEY: 'test-google-cse-key',
    VITE_GOOGLE_CSE_CX_ID: 'test-google-cx-id',
    VITE_PINECONE_API_KEY: 'test-pinecone-key',
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });

  (globalThis as Record<string, unknown>).__TEST_DEFAULT_API_KEYS__ = defaults;
}

