/**
 * Quick script to add a test job to Bull queue
 */
import Bull from 'bull';

const queue = new Bull('codeframe-generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  },
});

console.log('Adding test jobs to Bull queue...');

// Add 3 test jobs
const jobs = [];
for (let i = 1; i <= 3; i++) {
  const job = await queue.add('generate-cluster', {
    generation_id: 'test-gen-001',
    cluster_id: i,
    cluster_texts: [
      { id: `${i}-1`, text: 'Nike shoes', language: 'en' },
      { id: `${i}-2`, text: 'Adidas sneakers', language: 'en' },
    ],
    category_info: {
      name: 'Test Category',
      description: 'Test category for persistence testing',
    },
    config: {
      target_language: 'en',
      existing_codes: [],
    },
  });

  console.log(`✅ Added job ${job.id} for cluster ${i}`);
  jobs.push(job);
}

console.log(`\n✅ Added ${jobs.length} jobs to queue`);
console.log('\nJob IDs:', jobs.map(j => j.id).join(', '));

// Check queue stats
const waiting = await queue.getWaitingCount();
const active = await queue.getActiveCount();
const completed = await queue.getCompletedCount();
const failed = await queue.getFailedCount();

console.log('\n📊 Queue Stats:');
console.log(`   Waiting: ${waiting}`);
console.log(`   Active: ${active}`);
console.log(`   Completed: ${completed}`);
console.log(`   Failed: ${failed}`);

console.log('\n✅ Done! You can now test persistence by killing Express.');

await queue.close();
process.exit(0);
