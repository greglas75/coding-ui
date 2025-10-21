/**
 * Codeframe Tree Component
 * Renders hierarchical tree structure with expand/collapse
 */
import { useState, useCallback } from 'react';
import { TreeNode } from './TreeNode';
import type { HierarchyNode } from '@/types/codeframe';

interface CodeframeTreeProps {
  data: HierarchyNode[];
  selectedNodes: string[];
  onSelect: (nodeIds: string[]) => void;
  onRename: (nodeId: string, newName: string) => Promise<void>;
  onDelete: (nodeId: string) => Promise<void>;
}

export function CodeframeTree({
  data,
  selectedNodes,
  onSelect,
  onRename,
  onDelete,
}: CodeframeTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle node selection (multi-select with Ctrl/Cmd)
  const handleSelect = useCallback(
    (nodeId: string, event?: React.MouseEvent) => {
      if (event?.ctrlKey || event?.metaKey) {
        // Multi-select
        if (selectedNodes.includes(nodeId)) {
          onSelect(selectedNodes.filter((id) => id !== nodeId));
        } else {
          onSelect([...selectedNodes, nodeId]);
        }
      } else {
        // Single select
        onSelect([nodeId]);
      }
    },
    [selectedNodes, onSelect]
  );

  // Recursive tree renderer
  const renderNode = (node: HierarchyNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodes.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <TreeNode
          node={node}
          isSelected={isSelected}
          onToggle={() => toggleNode(node.id)}
          onSelect={() => handleSelect(node.id)}
          onRename={(newName) => onRename(node.id, newName)}
          onDelete={() => onDelete(node.id)}
          depth={depth}
        />

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Auto-expand first level on mount
  useState(() => {
    const firstLevelIds = data.map((node) => node.id);
    setExpandedNodes(new Set(firstLevelIds));
  });

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No hierarchy data available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Expand/Collapse All */}
      <div className="flex justify-end gap-2 mb-2 pb-2 border-b dark:border-gray-700">
        <button
          onClick={() => {
            // Expand all nodes
            const allIds = new Set<string>();
            const collectIds = (nodes: HierarchyNode[]) => {
              nodes.forEach((node) => {
                allIds.add(node.id);
                if (node.children) collectIds(node.children);
              });
            };
            collectIds(data);
            setExpandedNodes(allIds);
          }}
          className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
        >
          Expand All
        </button>
        <button
          onClick={() => setExpandedNodes(new Set())}
          className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
        >
          Collapse All
        </button>
      </div>

      {/* Tree */}
      <div className="overflow-auto max-h-[600px]">
        {data.map((node) => renderNode(node, 0))}
      </div>

      {/* Selection Info */}
      {selectedNodes.length > 0 && (
        <div className="mt-2 pt-2 border-t dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selectedNodes.length} node{selectedNodes.length > 1 ? 's' : ''} selected
            {selectedNodes.length > 1 && (
              <button
                onClick={() => onSelect([])}
                className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear selection
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
