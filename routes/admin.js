/**
import logger from '../utils/logger.js';
 * Admin Routes - Restart endpoints
 */
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

router.post('/restart/python', async (req, res) => {
  const log = req.log || console;
  try {
    log.info('[Admin] Restarting Python service...', { id: req.requestId });
    const { stdout, stderr } = await execAsync('pm2 restart python-service');
    log.info('[Admin] Python service restarted', { id: req.requestId, stdout });
    res.status(200).json({
      success: true,
      message: 'Python service restart initiated',
      output: stdout,
      id: req.requestId,
    });
  } catch (error) {
    log.error('[Admin] Python restart failed', { id: req.requestId }, error);
    res.status(500).json({
      success: false,
      error: error.message,
      id: req.requestId,
    });
  }
});

router.post('/restart/node', async (req, res) => {
  const log = req.log || console;
  try {
    log.info('[Admin] Restarting Node service...', { id: req.requestId });
    res.status(200).json({
      success: true,
      message: 'Node service restart initiated',
      id: req.requestId,
    });
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    log.error('[Admin] Node restart failed', { id: req.requestId }, error);
    res.status(500).json({
      success: false,
      error: error.message,
      id: req.requestId,
    });
  }
});

export default router;
