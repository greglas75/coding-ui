/**
 * Debug script to test API key flow
 */
import axios from 'axios';

const testPayload = {
  coding_type: 'brand',
  category_id: 2,
  algorithm_config: {
    min_cluster_size: 5,
    min_samples: 3,
    hierarchy_preference: 'adaptive',
  },
  target_language: 'en',
  anthropic_api_key: 'sk-ant-TEST',
  google_api_key: 'AIza-TEST',
  google_cse_cx_id: '40c7a-TEST',
  pinecone_api_key: 'pcsk_TEST-KEY-12345',
};

console.log('🔍 Sending request with API keys:');
console.log(JSON.stringify(testPayload, null, 2));

try {
  const response = await axios.post(
    'http://localhost:3020/api/v1/codeframe/generate',
    testPayload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('\n✅ Response:', response.data);
} catch (error) {
  console.error('\n❌ Error:', error.response?.data || error.message);
  console.error('Status:', error.response?.status);
}
