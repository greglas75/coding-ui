/**
 * Hook for AI-powered code discovery logic
 */

import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';
import { simpleLogger } from '../../../utils/logger';
import type { DiscoveredCode, VerificationProgress, VerificationStep } from '../types';

export function useAIDiscovery(categoryId: number, onSuccess: () => void) {
  const [limit, setLimit] = useState(100);
  const [minFrequency, setMinFrequency] = useState(2);
  const [discoveredCodes, setDiscoveredCodes] = useState<DiscoveredCode[]>([]);
  const [rejectedCodes, setRejectedCodes] = useState<DiscoveredCode[]>([]);
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('idle');
  const [verificationProgress, setVerificationProgress] = useState<VerificationProgress>({
    current: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(false);

  const discoverCodes = async () => {
    setLoading(true);
    setDiscoveredCodes([]);
    setVerificationStep('discovering');

    try {
      // STEP 1: Claude Haiku discovers brands from answers
      toast.info('Step 1/2: AI scanning answers for brands...');

      const discoverResponse = await axios.post('/api/v1/codes/ai-discover', {
        category_id: categoryId,
        limit,
        min_frequency: minFrequency,
      });

      const discoveredBrands = discoverResponse.data.discovered_codes || [];

      if (discoveredBrands.length === 0) {
        toast.info('No brands discovered. Try adjusting settings or analyzing more answers.');
        setVerificationStep('idle');
        setLoading(false);
        return;
      }

      simpleLogger.info(
        `[AI Discovery] Found ${discoveredBrands.length} brands:`,
        discoveredBrands
      );

      // STEP 2: Verify brands with Google
      setVerificationStep('verifying');
      setVerificationProgress({ current: 0, total: discoveredBrands.length });
      toast.info(`Step 2/2: Verifying ${discoveredBrands.length} brands with Google...`);

      const verifyResponse = await axios.post('/api/v1/codes/verify-brands', {
        codes: discoveredBrands,
      });

      const verifiedBrands = verifyResponse.data.verified || [];
      const rejectedBrands = verifyResponse.data.rejected || [];

      simpleLogger.info(
        `[Google Verification] Verified: ${verifiedBrands.length}, Rejected: ${rejectedBrands.length}`
      );

      setDiscoveredCodes(verifiedBrands);
      setRejectedCodes(rejectedBrands);
      setVerificationStep('done');

      if (verifiedBrands.length > 0) {
        toast.success(
          `✅ Verified ${verifiedBrands.length}/${discoveredBrands.length} brands!\n` +
            (rejectedBrands.length > 0 ? `${rejectedBrands.length} rejected (low confidence)` : '')
        );
      } else {
        toast.warning('No brands could be verified. Try different search terms.');
      }
    } catch (error: any) {
      simpleLogger.error('[AI Discovery] Error:', error);
      toast.error(`Discovery failed: ${error.response?.data?.message || error.message}`);
      setVerificationStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const saveCodes = async () => {
    if (discoveredCodes.length === 0) {
      toast.error('No codes to save');
      return;
    }

    setLoading(true);
    try {
      // Extract names (use official_name if verified, otherwise name)
      const codeNames = discoveredCodes.map(c => c.official_name || c.name);

      await axios.post('/api/v1/codes/bulk-create', {
        category_id: categoryId,
        code_names: codeNames,
      });

      toast.success(`Created ${discoveredCodes.length} verified brand codes!`);
      setDiscoveredCodes([]);
      setVerificationStep('idle');
      onSuccess();
    } catch (error: any) {
      toast.error(`Failed to create codes: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    limit,
    setLimit,
    minFrequency,
    setMinFrequency,
    discoveredCodes,
    rejectedCodes,
    verificationStep,
    verificationProgress,
    loading,
    discoverCodes,
    saveCodes,
  };
}
