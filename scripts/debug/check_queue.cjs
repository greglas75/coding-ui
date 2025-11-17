const Bull = require('bull');
const Redis = require('ioredis');

const redis = new Redis({
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const queue = new Bull('codeframe-generation', {
  redis: { maxRetriesPerRequest: null, enableReadyCheck: false }
});

(async () => {
  try {
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    console.log('📊 Bull Queue Status:');
    console.log(`   Waiting: ${waiting.length}`);
    console.log(`   Active: ${active.length}`);
    console.log(`   Completed: ${completed.length}`);
    console.log(`   Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Failed jobs:');
      for (const job of failed.slice(0, 3)) {
        const reason = job.failedReason || job.stacktrace?.[0] || 'Unknown';
        console.log(`   Job ${job.id}: ${reason.substring(0, 100)}`);
      }
    }

    if (waiting.length > 0) {
      console.log('\n⏳ Waiting jobs:');
      for (const job of waiting.slice(0, 3)) {
        console.log(`   Job ${job.id}: Cluster ${job.data.clusterId}`);
      }
    }

    await queue.close();
    await redis.quit();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
