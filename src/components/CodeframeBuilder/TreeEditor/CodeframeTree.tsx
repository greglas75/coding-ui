/**
 * Codeframe Tree Component
 * Renders hierarchical tree structure with expand/collapse
 */
import type { HierarchyNode } from '@/types/codeframe';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { simpleLogger } from '../../../utils/logger';
import { BrandInsightsModal } from '../modals/BrandInsightsModal';
import { BulkActions } from './BulkActions';
import { TreeNode } from './TreeNode';

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
  const [expandedDetailsNodes, setExpandedDetailsNodes] = useState<Set<string>>(new Set());
  const [checkboxSelectedNodes, setCheckboxSelectedNodes] = useState<Set<string>>(new Set());
  const [selectedBrandNode, setSelectedBrandNode] = useState<HierarchyNode | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Collect all brand codes (node_type === 'code') for navigation
  const brandCodes = useMemo(() => {
    const codes: HierarchyNode[] = [];
    const collectBrandCodes = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
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
    return brandCodes.findIndex(node => node.id === selectedBrandNode.id);
  }, [brandCodes, selectedBrandNode]);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
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
          onSelect(selectedNodes.filter(id => id !== nodeId));
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
      simpleLogger.info('Brand approved successfully:', result);

      // Navigate to next brand or close modal
      if (currentBrandIndex < brandCodes.length - 1) {
        setSelectedBrandNode(brandCodes[currentBrandIndex + 1]);
      } else {
        handleCloseModal();
      }
    } catch (error) {
      simpleLogger.error('Failed to approve brand:', error);
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
      simpleLogger.info('Brand rejected successfully:', result);

      // Navigate to next brand or close modal
      if (currentBrandIndex < brandCodes.length - 1) {
        setSelectedBrandNode(brandCodes[currentBrandIndex + 1]);
      } else {
        handleCloseModal();
      }
    } catch (error) {
      simpleLogger.error('Failed to reject brand:', error);
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
      simpleLogger.error('Failed to export JSON:', error);
      alert('Failed to export JSON. Please try again.');
    }
  }, [data]);

  // Export hierarchy as CSV
  const handleExportCSV = useCallback(() => {
    try {
      // Flatten tree structure into CSV rows
      const rows: string[][] = [];
      rows.push([
        'ID',
        'Name',
        'Description',
        'Type',
        'Level',
        'Confidence',
        'Cluster Size',
        'Parent ID',
      ]);

      const flattenNode = (node: HierarchyNode, level: number = 0, parentId: string = '') => {
        rows.push([
          node.id,
          node.name,
          node.description || '',
          node.node_type || '',
          level.toString(),
          node.confidence || '',
          node.cluster_size?.toString() || '',
          parentId,
        ]);

        if (node.children) {
          node.children.forEach(child => flattenNode(child, level + 1, node.id));
        }
      };

      data.forEach(node => flattenNode(node));

      // Convert to CSV format
      const csvContent = rows
        .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');

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
      simpleLogger.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  }, [data]);

  // Bulk Actions: Select All
  const handleSelectAll = useCallback(() => {
    const allCodeIds = new Set<string>();
    const collectCodeIds = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        if (node.node_type === 'code') {
          allCodeIds.add(node.id);
        }
        if (node.children) collectCodeIds(node.children);
      });
    };
    collectCodeIds(data);
    setCheckboxSelectedNodes(allCodeIds);
  }, [data]);

  // Bulk Actions: Select None
  const handleSelectNone = useCallback(() => {
    setCheckboxSelectedNodes(new Set());
  }, []);

  // Bulk Actions: Expand All Details
  const handleExpandAll = useCallback(() => {
    const allCodeIds = new Set<string>();
    const collectCodeIds = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        if (node.node_type === 'code') {
          allCodeIds.add(node.id);
        }
        if (node.children) collectCodeIds(node.children);
      });
    };
    collectCodeIds(data);
    setExpandedDetailsNodes(allCodeIds);

    // Also expand tree nodes
    const allNodeIds = new Set<string>();
    const collectAllIds = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        allNodeIds.add(node.id);
        if (node.children) collectAllIds(node.children);
      });
    };
    collectAllIds(data);
    setExpandedNodes(allNodeIds);
  }, [data]);

  // Bulk Actions: Collapse All Details
  const handleCollapseAll = useCallback(() => {
    setExpandedDetailsNodes(new Set());
  }, []);

  // Bulk Actions: Approve Selected
  const handleApproveSelected = useCallback(async () => {
    if (checkboxSelectedNodes.size === 0) return;

    try {
      const promises = Array.from(checkboxSelectedNodes).map(nodeId =>
        fetch(`/api/v1/codeframe/hierarchy/${nodeId}/approval`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        })
      );

      await Promise.all(promises);
      simpleLogger.info(`Approved ${checkboxSelectedNodes.size} brands`);
      setCheckboxSelectedNodes(new Set());
    } catch (error) {
      simpleLogger.error('Failed to approve selected brands:', error);
      alert('Failed to approve some brands. Please try again.');
    }
  }, [checkboxSelectedNodes]);

  // Bulk Actions: Reject Selected
  const handleRejectSelected = useCallback(async () => {
    if (checkboxSelectedNodes.size === 0) return;

    try {
      const promises = Array.from(checkboxSelectedNodes).map(nodeId =>
        fetch(`/api/v1/codeframe/hierarchy/${nodeId}/approval`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' }),
        })
      );

      await Promise.all(promises);
      simpleLogger.info(`Rejected ${checkboxSelectedNodes.size} brands`);
      setCheckboxSelectedNodes(new Set());
    } catch (error) {
      simpleLogger.error('Failed to reject selected brands:', error);
      alert('Failed to reject some brands. Please try again.');
    }
  }, [checkboxSelectedNodes]);

  // Handle checkbox toggle for individual nodes
  const handleCheckboxToggle = useCallback((nodeId: string) => {
    setCheckboxSelectedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle expand/collapse details for individual nodes
  const handleToggleDetails = useCallback((nodeId: string) => {
    setExpandedDetailsNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // A - Select All
      if (e.key === 'a' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // E - Expand All
      if (e.key === 'e' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleExpandAll();
        return;
      }

      // C - Collapse All
      if (e.key === 'c' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleCollapseAll();
        return;
      }

      // Enter - Approve selected (bulk or single)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (checkboxSelectedNodes.size > 0) {
          handleApproveSelected();
        }
        return;
      }

      // Shift+A - Approve selected
      if (e.key === 'A' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleApproveSelected();
        return;
      }

      // Shift+R - Reject selected
      if (e.key === 'R' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleRejectSelected();
        return;
      }

      // ? - Show help (could implement a help modal later)
      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault();
        alert(`Keyboard Shortcuts:
• A - Select All
• E - Expand All Details
• C - Collapse All Details
• Enter - Approve Selected
• Shift+A - Approve Selected (bulk)
• Shift+R - Reject Selected (bulk)
• Space - Toggle Details (when node focused)
• ? - Show this help`);
        return;
      }

      // Space - Toggle details for selected node
      if (e.key === ' ' && selectedNodes.length === 1) {
        e.preventDefault();
        handleToggleDetails(selectedNodes[0]);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSelectAll,
    handleExpandAll,
    handleCollapseAll,
    handleApproveSelected,
    handleRejectSelected,
    handleToggleDetails,
    checkboxSelectedNodes,
    selectedNodes,
  ]);

  // Recursive tree renderer
  const renderNode = (node: HierarchyNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodes.includes(node.id);
    const isDetailsExpanded = expandedDetailsNodes.has(node.id);
    const isCheckboxSelected = checkboxSelectedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <TreeNode
          node={node}
          isSelected={isSelected}
          isExpanded={isDetailsExpanded}
          isCheckboxSelected={isCheckboxSelected}
          onToggle={() => {
            toggleNode(node.id);
            // Also toggle details when toggling the node
            if (node.node_type === 'code') {
              handleToggleDetails(node.id);
            }
          }}
          onSelect={() => handleSelect(node.id)}
          onRename={newName => onRename(node.id, newName)}
          onDelete={() => onDelete(node.id)}
          onViewDetails={node.node_type === 'code' ? () => handleViewDetails(node) : undefined}
          onCheckboxToggle={
            node.node_type === 'code' ? () => handleCheckboxToggle(node.id) : undefined
          }
          onApprove={
            node.node_type === 'code'
              ? async () => {
                  try {
                    await fetch(`/api/v1/codeframe/hierarchy/${node.id}/approval`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'approved' }),
                    });
                    simpleLogger.info(`Approved brand: ${node.name}`);
                  } catch (error) {
                    simpleLogger.error('Failed to approve brand:', error);
                    alert('Failed to approve brand. Please try again.');
                  }
                }
              : undefined
          }
          onReject={
            node.node_type === 'code'
              ? async () => {
                  try {
                    await fetch(`/api/v1/codeframe/hierarchy/${node.id}/approval`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'rejected' }),
                    });
                    simpleLogger.info(`Rejected brand: ${node.name}`);
                  } catch (error) {
                    simpleLogger.error('Failed to reject brand:', error);
                    alert('Failed to reject brand. Please try again.');
                  }
                }
              : undefined
          }
          depth={depth}
        />

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div>{node.children!.map(child => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  // Auto-expand first level on mount
  useState(() => {
    const firstLevelIds = data.map(node => node.id);
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
      {/* Bulk Actions Toolbar */}
      <BulkActions
        selectedCount={checkboxSelectedNodes.size}
        totalCount={brandCodes.length}
        allExpanded={expandedDetailsNodes.size === brandCodes.length}
        onSelectAll={handleSelectAll}
        onSelectNone={handleSelectNone}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onApproveSelected={handleApproveSelected}
        onRejectSelected={handleRejectSelected}
        onDownloadJSON={handleExportJSON}
        onDownloadCSV={handleExportCSV}
      />

      {/* Tree */}
      <div className="overflow-auto max-h-[calc(100vh-400px)] min-h-[600px]">
        {data.map(node => renderNode(node, 0))}
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
