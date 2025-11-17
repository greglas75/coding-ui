const Bull = require('bull');

const queue = new Bull('codeframe-generation', {
  redis: { maxRetriesPerRequest: null, enableReadyCheck: false }
});

(async () => {
  try {
    const failed = await queue.getFailed();

    if (failed.length > 0 && failed[0].data) {
      console.log(`\nGeneration ID from failed jobs: ${failed[0].data.generation_id}`);
      console.log(`Cluster ID: ${failed[0].data.cluster_id}`);
      console.log(`Config: ${JSON.stringify(failed[0].data.config, null, 2)}`);
    } else {
      console.log('No failed jobs with data');
    }

    await queue.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
