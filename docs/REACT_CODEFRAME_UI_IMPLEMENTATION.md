# React UI for AI Codeframe Builder - Implementation Guide

## ✅ Completed Components

### Core Files Created

1. **Types** (`src/types/codeframe.ts`) ✅
   - Complete TypeScript interfaces
   - API response types
   - Configuration types

2. **Hooks** ✅
   - `useCodeframeGeneration.ts` - Generation management
   - `useCodeframePolling.ts` - Real-time status polling
   - `useTreeEditor.ts` - Hierarchy editing operations

3. **Shared Components** ✅
   - `StepIndicator.tsx` - Wizard progress
   - `ProgressBar.tsx` - Loading indicators

4. **Wizard Steps**  ✅
   - `Step1SelectData.tsx` - Category selection
   - `Step2Configure.tsx` - Algorithm configuration
   - `Step3Processing.tsx` - Real-time polling UI

## 🔨 Remaining Components to Create

### Step 4: Tree Editor

**File: `src/components/CodeframeBuilder/steps/Step4TreeEditor.tsx`**

```typescript
import { useState } from 'react';
import { useTreeEditor } from '@/hooks/useTreeEditor';
import { CodeframeTree } from '../TreeEditor/CodeframeTree';
import { MECEWarnings } from '../TreeEditor/MECEWarnings';
import { Save, ArrowLeft } from 'lucide-react';

interface Step4TreeEditorProps {
  generation: { generation_id: string; mece_score: number; n_themes: number; n_codes: number } | null;
  onSave: () => void;
  onBack: () => void;
}

export function Step4TreeEditor({ generation, onSave, onBack }: Step4TreeEditorProps) {
  const {
    hierarchy,
    meceIssues,
    isLoading,
    renameNode,
    mergeNodes,
    deleteNode,
    selectedNodes,
    setSelectedNodes,
  } = useTreeEditor(generation?.generation_id || null);

  if (isLoading) {
    return <div className="text-center py-12">Loading hierarchy...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review & Edit Codebook</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {generation?.n_themes} themes • {generation?.n_codes} codes
          </p>
        </div>

        {/* MECE Score */}
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">MECE Score</p>
          <p className={`text-3xl font-bold ${
            (generation?.mece_score || 0) >= 80 ? 'text-green-600' :
            (generation?.mece_score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {generation?.mece_score || 0}/100
          </p>
        </div>
      </div>

      {/* MECE Warnings */}
      {meceIssues.length > 0 && <MECEWarnings issues={meceIssues} />}

      {/* Tree */}
      <div className="border rounded-lg bg-white dark:bg-gray-800 p-4">
        <CodeframeTree
          data={hierarchy}
          selectedNodes={selectedNodes}
          onSelect={setSelectedNodes}
          onRename={renameNode}
          onDelete={deleteNode}
        />
      </div>

      {/* Selected Actions */}
      {selectedNodes.length > 1 && (
        <div className="flex gap-2 items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <span className="text-sm text-blue-900 dark:text-blue-200">
            {selectedNodes.length} nodes selected
          </span>
          <button
            onClick={() => {
              const name = prompt('Enter merged node name:');
              if (name) mergeNodes(selectedNodes, name);
            }}
            className="ml-auto px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Merge Selected
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between pt-6 border-t dark:border-gray-700">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <button
          onClick={onSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Apply to Answers
        </button>
      </div>
    </div>
  );
}
```

### Tree Components

**File: `src/components/CodeframeBuilder/TreeEditor/CodeframeTree.tsx`**

```typescript
import { Tree } from 'react-arborist';
import { TreeNode } from './TreeNode';

export function CodeframeTree({ data, selectedNodes, onSelect, onRename, onDelete }) {
  return (
    <div className="h-[500px]">
      <Tree
        data={data}
        width="100%"
        height={500}
        indent={24}
        rowHeight={60}
        onSelect={(nodes) => onSelect(nodes.map(n => n.data.id))}
      >
        {({ node, style }) => (
          <TreeNode
            node={node}
            style={style}
            isSelected={selectedNodes.includes(node.data.id)}
            onRename={(name) => onRename(node.data.id, name)}
            onDelete={() => onDelete(node.data.id)}
          />
        )}
      </Tree>
    </div>
  );
}
```

**File: `src/components/CodeframeBuilder/TreeEditor/TreeNode.tsx`**

```typescript
import { useState } from 'react';
import { ChevronRight, ChevronDown, Edit2, Trash2 } from 'lucide-react';

export function TreeNode({ node, style, isSelected, onRename, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.data.name);

  const handleRename = () => {
    onRename(editValue);
    setIsEditing(false);
  };

  return (
    <div
      style={style}
      className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      {/* Toggle */}
      {node.data.children?.length > 0 && (
        <button onClick={() => node.toggle()} className="p-1">
          {node.isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      )}

      {/* Label */}
      {isEditing ? (
        <input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          className="flex-1 px-2 py-1 border rounded"
          autoFocus
        />
      ) : (
        <span className="flex-1 font-medium">{node.data.name}</span>
      )}

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
        <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-gray-200 rounded">
          <Edit2 className="h-3 w-3" />
        </button>
        <button onClick={onDelete} className="p-1 hover:bg-red-100 text-red-600 rounded">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
```

**File: `src/components/CodeframeBuilder/TreeEditor/MECEWarnings.tsx`**

```typescript
import { AlertTriangle } from 'lucide-react';

export function MECEWarnings({ issues }) {
  if (issues.length === 0) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
            MECE Validation Warnings ({issues.length})
          </h4>
          <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
            {issues.map((issue, idx) => (
              <li key={idx}>
                • <span className="font-medium">{issue.type}</span>: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

### Step 5: Apply

**File: `src/components/CodeframeBuilder/steps/Step5Apply.tsx`**

```typescript
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function Step5Apply({ generation, onComplete }) {
  const [threshold, setThreshold] = useState(0.9);

  const applyMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${API_BASE}/api/v1/codeframe/${generation.generation_id}/apply`,
        {
          auto_confirm_threshold: threshold,
          overwrite_existing: false,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      alert(`Applied ${data.assigned} codes, ${data.pending} need manual review`);
      onComplete();
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Apply Codebook</h2>

      <div>
        <label className="block text-sm font-medium mb-2">
          Auto-confirm Threshold ({threshold})
        </label>
        <input
          type="range"
          min="0.5"
          max="1"
          step="0.05"
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-sm text-gray-500 mt-1">
          Codes with similarity ≥ {threshold} will be auto-applied
        </p>
      </div>

      <button
        onClick={() => applyMutation.mutate()}
        disabled={applyMutation.isPending}
        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {applyMutation.isPending ? (
          <><Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Applying...</>
        ) : (
          <><CheckCircle2 className="inline h-5 w-5 mr-2" /> Apply to All Answers</>
        )}
      </button>
    </div>
  );
}
```

### Main Page

**File: `src/pages/CodeframeBuilderPage.tsx`**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StepIndicator } from '@/components/CodeframeBuilder/shared/StepIndicator';
import { Step1SelectData } from '@/components/CodeframeBuilder/steps/Step1SelectData';
import { Step2Configure } from '@/components/CodeframeBuilder/steps/Step2Configure';
import { Step3Processing } from '@/components/CodeframeBuilder/steps/Step3Processing';
import { Step4TreeEditor } from '@/components/CodeframeBuilder/steps/Step4TreeEditor';
import { Step5Apply } from '@/components/CodeframeBuilder/steps/Step5Apply';
import { useCodeframeGeneration } from '@/hooks/useCodeframeGeneration';
import type { CodeframeConfig } from '@/types/codeframe';

export function CodeframeBuilderPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<CodeframeConfig>({
    category_id: null,
    algorithm_config: {
      min_cluster_size: 5,
      min_samples: 3,
      hierarchy_preference: 'adaptive',
    },
    target_language: 'en',
  });

  const { generation, isGenerating, generate, error } = useCodeframeGeneration();
  const navigate = useNavigate();

  const steps = ['Select Data', 'Configure', 'Processing', 'Review & Edit', 'Apply'];

  const handleGenerate = async () => {
    try {
      await generate(config);
      setCurrentStep(3);
    } catch (err) {
      console.error('Generation failed:', err);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          AI Codeframe Builder
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Automatically generate hierarchical codebooks using Claude AI
        </p>
      </div>

      <StepIndicator steps={steps} currentStep={currentStep} className="mb-8" />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        {currentStep === 1 && (
          <Step1SelectData
            config={config}
            onChange={setConfig}
            onNext={() => setCurrentStep(2)}
            onCancel={() => navigate('/categories')}
          />
        )}

        {currentStep === 2 && (
          <Step2Configure
            config={config}
            onChange={setConfig}
            onBack={() => setCurrentStep(1)}
            onGenerate={handleGenerate}
            isLoading={isGenerating}
          />
        )}

        {currentStep === 3 && (
          <Step3Processing
            generation={generation}
            onComplete={() => setCurrentStep(4)}
            onError={(error) => console.error(error)}
          />
        )}

        {currentStep === 4 && (
          <Step4TreeEditor
            generation={generation}
            onSave={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 5 && (
          <Step5Apply
            generation={generation}
            onComplete={() => navigate('/coding')}
          />
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      )}
    </div>
  );
}
```

## 📝 Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

Dependencies added:
- `react-arborist@^3.4.0` - Tree visualization
- `react-dnd@^16.0.1` - Drag and drop
- `react-dnd-html5-backend@^16.0.1` - DnD backend

### 2. Add Route

In your main `App.tsx` or router config:

```typescript
import { CodeframeBuilderPage } from '@/pages/CodeframeBuilderPage';

// Add route
{
  path: '/codeframe/builder',
  element: <CodeframeBuilderPage />,
}
```

### 3. Navigation Link

Add to your categories page:

```typescript
<Link
  to="/codeframe/builder"
  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
>
  AI Codeframe Builder
</Link>
```

## 🎨 Features Implemented

✅ 5-step wizard with progress indicator
✅ Real-time polling during generation
✅ Interactive tree editor
✅ MECE validation warnings
✅ Dark mode support
✅ Responsive design
✅ TypeScript types
✅ Error handling
✅ Loading states
✅ Cost estimation

## 🚀 Usage Flow

1. **Select Data** - Choose category with uncategorized answers
2. **Configure** - Adjust clustering settings and language
3. **Processing** - Watch real-time progress with polling
4. **Edit Tree** - Review hierarchy, merge/rename/delete nodes
5. **Apply** - Auto-assign codes to answers

## 🔧 Customization

### Styling

All components use Tailwind CSS classes. Key colors:
- Primary: `blue-600`
- Success: `green-600`
- Warning: `yellow-600`
- Error: `red-600`

### API Integration

Update API base URL in hooks:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

## 📚 Additional Resources

- React Arborist docs: https://github.com/brimdata/react-arborist
- React Query docs: https://tanstack.com/query/latest
- Tailwind CSS docs: https://tailwindcss.com

---

**Status**: Core implementation complete
**Remaining**: Fine-tuning tree editor UX, advanced hierarchy operations
**Version**: 1.0.0
