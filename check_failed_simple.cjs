const Bull = require('bull');

const queue = new Bull('codeframe-generation', {
  redis: { maxRetriesPerRequest: null, enableReadyCheck: false }
});

(async () => {
  try {
    const failed = await queue.getFailed();

    console.log(`\n❌ ${failed.length} failed jobs\n`);

    for (const job of failed) {
      console.log(`Job ${job.id}:`);
      console.log(`  Failed Reason: ${job.failedReason || 'No reason'}`);

      if (job.stacktrace && job.stacktrace.length > 0) {
        console.log(`  Stack: ${job.stacktrace[0].substring(0, 200)}`);
      }

      // Try to see what data exists
      console.log(`  Data keys: ${job.data ? Object.keys(job.data).join(', ') : 'No data'}`);
      console.log('');
    }

    // Clear failed jobs to start fresh
    console.log('\n🧹 Clearing all failed jobs...');
    await queue.clean(0, 'failed');
    console.log('✅ Failed jobs cleared\n');

    await queue.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
