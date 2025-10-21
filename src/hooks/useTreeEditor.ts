/**
 * Hook for managing tree editor state and operations
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { HierarchyNode, HierarchyUpdateAction, MECEIssue } from '@/types/codeframe';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useTreeEditor(generationId: string | null) {
  const queryClient = useQueryClient();
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  // Fetch hierarchy
  const { data: hierarchyData, isLoading } = useQuery({
    queryKey: ['codeframe-hierarchy', generationId],
    queryFn: async () => {
      if (!generationId) return null;

      const response = await axios.get(
        `${API_BASE}/api/v1/codeframe/${generationId}/hierarchy`
      );
      return response.data;
    },
    enabled: !!generationId,
  });

  // Update hierarchy mutation
  const updateMutation = useMutation({
    mutationFn: async (action: HierarchyUpdateAction) => {
      if (!generationId) throw new Error('No generation ID');

      const response = await axios.patch(
        `${API_BASE}/api/v1/codeframe/${generationId}/hierarchy`,
        action
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch hierarchy
      queryClient.invalidateQueries({
        queryKey: ['codeframe-hierarchy', generationId],
      });
    },
  });

  // Tree operations
  const renameNode = useCallback(
    async (nodeId: string, newName: string) => {
      await updateMutation.mutateAsync({
        action: 'rename',
        node_id: nodeId,
        new_name: newName,
      });
    },
    [updateMutation]
  );

  const mergeNodes = useCallback(
    async (nodeIds: string[], targetName: string) => {
      await updateMutation.mutateAsync({
        action: 'merge',
        node_ids: nodeIds,
        target_name: targetName,
      });
      setSelectedNodes([]);
    },
    [updateMutation]
  );

  const moveNode = useCallback(
    async (nodeId: string, newParentId: string | null) => {
      await updateMutation.mutateAsync({
        action: 'move',
        node_id: nodeId,
        new_parent_id: newParentId,
      });
    },
    [updateMutation]
  );

  const deleteNode = useCallback(
    async (nodeId: string) => {
      await updateMutation.mutateAsync({
        action: 'delete',
        node_id: nodeId,
      });
    },
    [updateMutation]
  );

  // Extract MECE issues from hierarchy data
  const meceIssues: MECEIssue[] = hierarchyData?.mece_issues || [];

  return {
    hierarchy: hierarchyData?.hierarchy || [],
    meceIssues,
    isLoading,
    isUpdating: updateMutation.isPending,
    error: updateMutation.error,

    // Operations
    renameNode,
    mergeNodes,
    moveNode,
    deleteNode,

    // Selection
    selectedNodes,
    setSelectedNodes,
    clearSelection: () => setSelectedNodes([]),
  };
}
