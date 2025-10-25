/**
 * Individual Tree Node Component
 */
import { useState } from 'react';
import { ChevronRight, ChevronDown, Edit2, Trash2, Check, X, Info } from 'lucide-react';
import type { HierarchyNode } from '@/types/codeframe';

interface TreeNodeProps {
  node: HierarchyNode;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onViewDetails?: () => void;
  depth: number;
}

export function TreeNode({
  node,
  isSelected,
  onToggle,
  onSelect,
  onRename,
  onDelete,
  onViewDetails,
  depth,
}: TreeNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const [isHovered, setIsHovered] = useState(false);

  const hasChildren = node.children && node.children.length > 0;

  const handleRename = () => {
    if (editValue.trim() && editValue !== node.name) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(node.name);
    setIsEditing(false);
  };

  // Color based on node type
  const getNodeColor = () => {
    switch (node.node_type) {
      case 'theme':
        return 'text-blue-700 dark:text-blue-400';
      case 'code':
        return 'text-green-700 dark:text-green-400';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  // Badge for confidence
  const ConfidenceBadge = () => {
    if (!node.confidence) return null;

    const colors = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };

    return (
      <span className={`text-xs px-2 py-0.5 rounded ${colors[node.confidence]}`}>
        {node.confidence}
      </span>
    );
  };

  return (
    <div
      className={`group ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer`}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        onClick={onSelect}
      >
        {/* Toggle Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle();
          }}
          className={`p-0.5 ${hasChildren ? 'visible' : 'invisible'}`}
        >
          {hasChildren && (
            <ChevronRight className={`h-4 w-4 transition-transform ${hasChildren ? '' : 'opacity-0'}`} />
          )}
        </button>

        {/* Node Type Icon */}
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
          node.node_type === 'theme' ? 'bg-blue-500' :
          node.node_type === 'code' ? 'bg-green-500' :
          'bg-gray-400'
        }`} />

        {/* Label or Edit Input */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') handleCancel();
              }}
              className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
            <button
              onClick={handleRename}
              className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <span className={`flex-1 font-medium ${getNodeColor()}`}>
              {node.name}
            </span>

            {/* Confidence Badge */}
            <ConfidenceBadge />

            {/* Cluster Size */}
            {node.cluster_size && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({node.cluster_size})
              </span>
            )}

            {/* Actions - Show on hover or selected */}
            {(isHovered || isSelected) && (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                {/* Show View Details for brand codes with validation evidence */}
                {node.node_type === 'code' && onViewDetails && (
                  <button
                    onClick={onViewDetails}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded"
                    title="View validation details"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  title="Rename"
                >
                  <Edit2 className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Description */}
      {node.description && !isEditing && (
        <div
          className="text-xs text-gray-500 dark:text-gray-400 ml-2 mt-1 italic"
          style={{ paddingLeft: `${depth * 24 + 32}px` }}
        >
          {node.description}
        </div>
      )}

      {/* Example Texts */}
      {node.example_texts && !isEditing && (() => {
        try {
          const examples = typeof node.example_texts === 'string'
            ? JSON.parse(node.example_texts)
            : node.example_texts;
          if (examples && Array.isArray(examples) && examples.length > 0) {
            return (
              <div
                className="text-xs text-gray-400 dark:text-gray-500 ml-2 mt-1"
                style={{ paddingLeft: `${depth * 24 + 32}px` }}
              >
                Examples: {examples.slice(0, 2).map((ex: any) => typeof ex === 'string' ? `"${ex}"` : `"${ex.text}"`).join(', ')}
              </div>
            );
          }
        } catch (e) {
          console.error('Failed to parse example_texts:', e);
        }
        return null;
      })()}
    </div>
  );
}
