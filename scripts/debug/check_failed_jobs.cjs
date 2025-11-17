const Bull = require('bull');

const queue = new Bull('codeframe-generation', {
  redis: { maxRetriesPerRequest: null, enableReadyCheck: false }
});

(async () => {
  try {
    const failed = await queue.getFailed();

    console.log(`\n❌ All ${failed.length} failed jobs:\n`);

    for (const job of failed) {
      console.log(`Job ${job.id}:`);
      console.log(`  Generation ID: ${job.data.generationId}`);
      console.log(`  Cluster ID: ${job.data.clusterId}`);
      console.log(`  Answers: ${job.data.answers.length}`);
      console.log(`  Failed Reason: ${job.failedReason}`);

      if (job.stacktrace && job.stacktrace.length > 0) {
        console.log(`  Stack trace (first line): ${job.stacktrace[0].substring(0, 150)}`);
      }
      console.log('');
    }

    await queue.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
