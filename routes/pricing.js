/**
import logger from '../utils/logger.js';
 * AI Pricing Routes
 */
import express from 'express';
import pricingFetcher from '../server/pricing/pricingFetcher.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const log = req.log || console;
  try {
    const pricing = await pricingFetcher.getCachedPricing();
    log.info('[Pricing] Retrieved pricing', { id: req.requestId });
    res.status(200).json({
      success: true,
      pricing,
      cachedAt: pricingFetcher.lastFetch || null,
      id: req.requestId,
    });
  } catch (error) {
    log.error('[Pricing] Failed to get pricing', { id: req.requestId }, error);
    res.status(500).json({
      success: false,
      error: error.message,
      id: req.requestId,
    });
  }
});

router.post('/refresh', async (req, res) => {
  const log = req.log || console;
  try {
    log.info('[Pricing] Refreshing pricing...', { id: req.requestId });
    const pricing = await pricingFetcher.fetchPricing(true);
    log.info('[Pricing] Pricing refreshed', { id: req.requestId });
    res.status(200).json({
      success: true,
      pricing,
      refreshedAt: new Date().toISOString(),
      id: req.requestId,
    });
  } catch (error) {
    log.error('[Pricing] Failed to refresh pricing', { id: req.requestId }, error);
    res.status(500).json({
      success: false,
      error: error.message,
      id: req.requestId,
    });
  }
});

export default router;
