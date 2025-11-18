import { CheckCircle, XCircle, AlertCircle, Eye, Zap, Globe, Database } from 'lucide-react';
import type { MultiSourceValidationResult } from '../../../../../services/multiSourceValidator';

interface AdditionalInfoProps {
  result: MultiSourceValidationResult;
}

export function AdditionalInfo({ result }: AdditionalInfoProps) {
  return (
    <>
      {/* Matched Brand (if any) */}
      {result.brand && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="font-semibold text-green-900 dark:text-green-200">
              Matched Brand
            </div>
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {result.brand}
          </div>
          {result.brand_id && (
            <div className="text-xs text-green-700 dark:text-green-300 mt-1">
              ID: {result.brand_id}
            </div>
          )}
        </div>
      )}

      {/* Category Error (if any) */}
      {result.type === 'category_error' && result.detected_entity && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div className="font-semibold text-red-900 dark:text-red-200">
              Category Mismatch Detected
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold text-red-800 dark:text-red-300">Detected:</span>{' '}
              <span className="text-red-900 dark:text-red-100">{result.detected_entity}</span>
              {result.detected_category && (
                <span className="text-red-700 dark:text-red-300">
                  {' '}
                  ({result.detected_category})
                </span>
              )}
            </div>
            <div>
              <span className="font-semibold text-red-800 dark:text-red-300">Expected:</span>{' '}
              <span className="text-red-900 dark:text-red-100">{result.expected_category}</span>
            </div>
          </div>
        </div>
      )}

      {/* Candidates (for ambiguous) */}
      {result.candidates && result.candidates.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Disambiguation Candidates ({result.candidates.length})
          </h3>
          <div className="space-y-2">
            {result.candidates.map((candidate, idx) => (
              <div
                key={idx}
                className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-yellow-900 dark:text-yellow-100 text-lg">
                      {candidate.brand}
                    </div>
                    {candidate.full_name !== candidate.brand && (
                      <div className="text-sm text-yellow-700 dark:text-yellow-300">
                        {candidate.full_name}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                      {(candidate.score * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">
                      Composite Score
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>
                      Vision: {(candidate.vision_frequency * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span>
                      Embedding: {(candidate.embedding_similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span>KG: {candidate.kg_verified ? '✓ Verified' : '✗ Not found'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    <span>Pinecone: {candidate.pinecone_match ? '✓ Match' : '✗ New'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
