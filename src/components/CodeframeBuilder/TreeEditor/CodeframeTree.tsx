/**
 * Codeframe Tree Component
 * Renders hierarchical tree structure with expand/collapse
 */
import { useState, useCallback, useMemo } from 'react';
import { Download } from 'lucide-react';
import { TreeNode } from './TreeNode';
import { BrandInsightsModal } from '../modals/BrandInsightsModal';
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
  const [selectedBrandNode, setSelectedBrandNode] = useState<HierarchyNode | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Collect all brand codes (node_type === 'code') for navigation
  const brandCodes = useMemo(() => {
    const codes: HierarchyNode[] = [];
    const collectBrandCodes = (nodes: HierarchyNode[]) => {
      nodes.forEach((node) => {
        if (node.node_type === 'code') {
          codes.push(node);
        }
        if (node.children) {
          collectBrandCodes(node.children);
        }
      });
    };
    collectBrandCodes(data);
    return codes;
  }, [data]);

  // Get current brand code index for navigation
  const currentBrandIndex = useMemo(() => {
    if (!selectedBrandNode) return -1;
    return brandCodes.findIndex((node) => node.id === selectedBrandNode.id);
  }, [brandCodes, selectedBrandNode]);

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

  // Handle view details for brand codes
  const handleViewDetails = useCallback((node: HierarchyNode) => {
    setSelectedBrandNode(node);
    setIsModalOpen(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // Don't clear selectedBrandNode immediately - let modal animation finish
    setTimeout(() => setSelectedBrandNode(null), 300);
  }, []);

  // Handle brand approval
  const handleApprove = useCallback(async () => {
    if (!selectedBrandNode) return;

    try {
      // Call API to approve brand
      const response = await fetch(`/api/v1/codeframe/hierarchy/${selectedBrandNode.id}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve brand');
      }

      const result = await response.json();
      console.log('Brand approved successfully:', result);

      // Navigate to next brand or close modal
      if (currentBrandIndex < brandCodes.length - 1) {
        setSelectedBrandNode(brandCodes[currentBrandIndex + 1]);
      } else {
        handleCloseModal();
      }
    } catch (error) {
      console.error('Failed to approve brand:', error);
      alert('Failed to approve brand. Please try again.');
    }
  }, [selectedBrandNode, currentBrandIndex, brandCodes, handleCloseModal]);

  // Handle brand rejection
  const handleReject = useCallback(async () => {
    if (!selectedBrandNode) return;

    try {
      // Call API to reject brand
      const response = await fetch(`/api/v1/codeframe/hierarchy/${selectedBrandNode.id}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject brand');
      }

      const result = await response.json();
      console.log('Brand rejected successfully:', result);

      // Navigate to next brand or close modal
      if (currentBrandIndex < brandCodes.length - 1) {
        setSelectedBrandNode(brandCodes[currentBrandIndex + 1]);
      } else {
        handleCloseModal();
      }
    } catch (error) {
      console.error('Failed to reject brand:', error);
      alert('Failed to reject brand. Please try again.');
    }
  }, [selectedBrandNode, currentBrandIndex, brandCodes, handleCloseModal]);

  // Navigate to previous brand
  const handlePrevious = useCallback(() => {
    if (currentBrandIndex > 0) {
      setSelectedBrandNode(brandCodes[currentBrandIndex - 1]);
    }
  }, [currentBrandIndex, brandCodes]);

  // Navigate to next brand
  const handleNext = useCallback(() => {
    if (currentBrandIndex < brandCodes.length - 1) {
      setSelectedBrandNode(brandCodes[currentBrandIndex + 1]);
    }
  }, [currentBrandIndex, brandCodes]);

  // Export hierarchy as JSON
  const handleExportJSON = useCallback(() => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `codeframe-hierarchy-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export JSON:', error);
      alert('Failed to export JSON. Please try again.');
    }
  }, [data]);

  // Export hierarchy as CSV
  const handleExportCSV = useCallback(() => {
    try {
      // Flatten tree structure into CSV rows
      const rows: string[][] = [];
      rows.push(['ID', 'Name', 'Description', 'Type', 'Level', 'Confidence', 'Cluster Size', 'Parent ID']);

      const flattenNode = (node: HierarchyNode, level: number = 0, parentId: string = '') => {
        rows.push([
          node.id,
          node.name,
          node.description || '',
          node.node_type || '',
          level.toString(),
          node.confidence || '',
          node.cluster_size?.toString() || '',
          parentId
        ]);

        if (node.children) {
          node.children.forEach((child) => flattenNode(child, level + 1, node.id));
        }
      };

      data.forEach((node) => flattenNode(node));

      // Convert to CSV format
      const csvContent = rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `codeframe-hierarchy-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  }, [data]);

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
          onViewDetails={node.node_type === 'code' ? () => handleViewDetails(node) : undefined}
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
      {/* Expand/Collapse All & Export */}
      <div className="flex justify-between items-center mb-2 pb-2 border-b dark:border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={handleExportJSON}
            className="text-xs px-2 py-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded flex items-center gap-1"
            title="Export as JSON"
          >
            <Download className="h-3 w-3" />
            JSON
          </button>
          <button
            onClick={handleExportCSV}
            className="text-xs px-2 py-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded flex items-center gap-1"
            title="Export as CSV"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
        <div className="flex gap-2">
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
      </div>

      {/* Tree */}
      <div className="overflow-auto max-h-[calc(100vh-400px)] min-h-[600px]">
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

      {/* Brand Insights Modal */}
      {selectedBrandNode && (
        <BrandInsightsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          node={selectedBrandNode}
          onApprove={handleApprove}
          onReject={handleReject}
          onPrevious={handlePrevious}
          onNext={handleNext}
          hasPrevious={currentBrandIndex > 0}
          hasNext={currentBrandIndex < brandCodes.length - 1}
        />
      )}
    </div>
  );
}
