/**
 * Integration tests for Codeframe API endpoints
 * Run with: npm test tests/codeframe.test.js
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import codeframeRoutes from '../routes/codeframe.js';

// Mock services
vi.mock('../services/codeframeService.js', () => ({
  default: {
    startGeneration: vi.fn(),
    getStatus: vi.fn(),
    getHierarchy: vi.fn(),
    updateHierarchy: vi.fn(),
    applyCodeframe: vi.fn(),
  },
}));

vi.mock('../utils/codeframeHelpers.js', async () => {
  const actual = await vi.importActual('../utils/codeframeHelpers.js');
  return {
    ...actual,
    isCodeframeFeatureEnabled: vi.fn(() => true),
    checkPythonServiceHealth: vi.fn(() => Promise.resolve(true)),
    getPythonServiceUrl: vi.fn(() => 'http://localhost:8000'),
  };
});

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/codeframe', codeframeRoutes);

describe('Codeframe API', () => {
  describe('POST /api/v1/codeframe/generate', () => {
    test('should return 202 with generation info', async () => {
      const mockGeneration = {
        generation_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'processing',
        n_clusters: 5,
        n_answers: 100,
        estimated_time_seconds: 25,
        poll_url: '/api/v1/codeframe/123e4567-e89b-12d3-a456-426614174000/status',
      };

      const codeframeService = await import('../services/codeframeService.js');
      codeframeService.default.startGeneration.mockResolvedValue(mockGeneration);

      const response = await request(app)
        .post('/api/v1/codeframe/generate')
        .send({
          category_id: 1,
          answer_ids: [1, 2, 3, 4, 5],
          algorithm_config: {
            min_cluster_size: 5,
          },
        });

      expect(response.status).toBe(202);
      expect(response.body.generation_id).toBeDefined();
      expect(response.body.status).toBe('processing');
      expect(response.body.n_clusters).toBe(5);
      expect(response.body.cost_estimate).toBeDefined();
    });

    test('should return 400 for invalid category_id', async () => {
      const response = await request(app).post('/api/v1/codeframe/generate').send({
        category_id: -1, // Invalid
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });

    test('should return 400 for missing category_id', async () => {
      const response = await request(app).post('/api/v1/codeframe/generate').send({
        answer_ids: [1, 2, 3],
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('GET /api/v1/codeframe/:generation_id/status', () => {
    test('should return generation status', async () => {
      const mockStatus = {
        generation_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed',
        progress: 100,
        n_clusters: 5,
        n_completed: 5,
        n_failed: 0,
        processing_time_ms: 45000,
        mece_score: 87.5,
      };

      const codeframeService = await import('../services/codeframeService.js');
      codeframeService.default.getStatus.mockResolvedValue(mockStatus);

      const response = await request(app).get(
        '/api/v1/codeframe/123e4567-e89b-12d3-a456-426614174000/status'
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      expect(response.body.progress).toBe(100);
      expect(response.body.mece_score).toBe(87.5);
    });

    test('should return 500 for non-existent generation', async () => {
      const codeframeService = await import('../services/codeframeService.js');
      codeframeService.default.getStatus.mockRejectedValue(
        new Error('Generation not found')
      );

      const response = await request(app).get(
        '/api/v1/codeframe/non-existent-id/status'
      );

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Generation');
    });
  });

  describe('GET /api/v1/codeframe/:generation_id/hierarchy', () => {
    test('should return hierarchy tree', async () => {
      const mockHierarchy = {
        generation_id: '123e4567-e89b-12d3-a456-426614174000',
        hierarchy: [
          {
            id: 'node-1',
            name: 'Athletic Brands',
            level: 1,
            node_type: 'theme',
            children: [
              {
                id: 'node-2',
                name: 'Nike',
                level: 2,
                node_type: 'code',
                cluster_size: 45,
                confidence: 'high',
                children: [],
              },
            ],
          },
        ],
      };

      const codeframeService = await import('../services/codeframeService.js');
      codeframeService.default.getHierarchy.mockResolvedValue(mockHierarchy);

      const response = await request(app).get(
        '/api/v1/codeframe/123e4567-e89b-12d3-a456-426614174000/hierarchy'
      );

      expect(response.status).toBe(200);
      expect(response.body.hierarchy).toBeDefined();
      expect(response.body.hierarchy.length).toBeGreaterThan(0);
      expect(response.body.hierarchy[0].node_type).toBe('theme');
    });
  });

  describe('PATCH /api/v1/codeframe/:generation_id/hierarchy', () => {
    test('should rename a node', async () => {
      const mockResult = {
        success: true,
        node: {
          id: 'node-1',
          name: 'New Name',
          is_edited: true,
        },
      };

      const codeframeService = await import('../services/codeframeService.js');
      codeframeService.default.updateHierarchy.mockResolvedValue(mockResult);

      const response = await request(app)
        .patch('/api/v1/codeframe/123e4567-e89b-12d3-a456-426614174000/hierarchy')
        .send({
          action: 'rename',
          node_id: 'node-1',
          new_name: 'New Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.node.name).toBe('New Name');
    });

    test('should merge nodes', async () => {
      const mockResult = {
        success: true,
        merged_node: {
          id: 'merged-node',
          name: 'Merged Brand',
        },
      };

      const codeframeService = await import('../services/codeframeService.js');
      codeframeService.default.updateHierarchy.mockResolvedValue(mockResult);

      const response = await request(app)
        .patch('/api/v1/codeframe/123e4567-e89b-12d3-a456-426614174000/hierarchy')
        .send({
          action: 'merge',
          node_ids: ['node-1', 'node-2'],
          target_name: 'Merged Brand',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 400 for invalid action', async () => {
      const response = await request(app)
        .patch('/api/v1/codeframe/123e4567-e89b-12d3-a456-426614174000/hierarchy')
        .send({
          action: 'invalid_action',
          node_id: 'node-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('POST /api/v1/codeframe/:generation_id/apply', () => {
    test('should apply codeframe with default settings', async () => {
      const mockResult = {
        success: true,
        total_answers: 100,
        assigned: 85,
        pending: 15,
      };

      const codeframeService = await import('../services/codeframeService.js');
      codeframeService.default.applyCodeframe.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/codeframe/123e4567-e89b-12d3-a456-426614174000/apply')
        .send({});

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.assigned).toBe(85);
    });

    test('should apply codeframe with custom threshold', async () => {
      const mockResult = {
        success: true,
        total_answers: 100,
        assigned: 95,
        pending: 5,
      };

      const codeframeService = await import('../services/codeframeService.js');
      codeframeService.default.applyCodeframe.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/codeframe/123e4567-e89b-12d3-a456-426614174000/apply')
        .send({
          auto_confirm_threshold: 0.8,
          overwrite_existing: true,
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/codeframe/health', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/api/v1/codeframe/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBeDefined();
      expect(response.body.feature_enabled).toBe(true);
      expect(response.body.python_service).toBe('healthy');
    });
  });
});

describe('Validation', () => {
  describe('generateCodeframeSchema', () => {
    test('should validate correct input', async () => {
      const { validateRequest, generateCodeframeSchema } = await import(
        '../utils/codeframeHelpers.js'
      );

      const validData = {
        category_id: 1,
        answer_ids: [1, 2, 3],
        algorithm_config: {
          min_cluster_size: 5,
        },
      };

      const result = validateRequest(generateCodeframeSchema, validData);

      expect(result.category_id).toBe(1);
      expect(result.algorithm_config.min_cluster_size).toBe(5);
    });

    test('should reject negative category_id', async () => {
      const { validateRequest, generateCodeframeSchema } = await import(
        '../utils/codeframeHelpers.js'
      );

      expect(() => {
        validateRequest(generateCodeframeSchema, {
          category_id: -1,
        });
      }).toThrow('Validation failed');
    });

    test('should use default values', async () => {
      const { validateRequest, generateCodeframeSchema } = await import(
        '../utils/codeframeHelpers.js'
      );

      const result = validateRequest(generateCodeframeSchema, {
        category_id: 1,
      });

      expect(result.target_language).toBe('en');
      expect(result.existing_codes).toEqual([]);
      expect(result.algorithm_config.hierarchy_preference).toBe('adaptive');
    });
  });
});

describe('Helper Functions', () => {
  describe('estimateGenerationCost', () => {
    test('should calculate cost correctly', async () => {
      const { estimateGenerationCost } = await import('../utils/codeframeHelpers.js');

      const estimate = estimateGenerationCost(100, 5);

      expect(estimate.n_answers).toBe(100);
      expect(estimate.n_clusters).toBe(5);
      expect(estimate.estimated_cost_usd).toBeGreaterThan(0);
      expect(estimate.breakdown).toBeDefined();
    });
  });

  describe('formatHierarchyTree', () => {
    test('should build tree from flat nodes', async () => {
      const { formatHierarchyTree } = await import('../utils/codeframeHelpers.js');

      const flatNodes = [
        {
          id: 'node-1',
          name: 'Root',
          parent_id: null,
          level: 1,
          node_type: 'theme',
          display_order: 0,
        },
        {
          id: 'node-2',
          name: 'Child',
          parent_id: 'node-1',
          level: 2,
          node_type: 'code',
          display_order: 0,
        },
      ];

      const tree = formatHierarchyTree(flatNodes);

      expect(tree.length).toBe(1);
      expect(tree[0].name).toBe('Root');
      expect(tree[0].children.length).toBe(1);
      expect(tree[0].children[0].name).toBe('Child');
    });
  });
});
