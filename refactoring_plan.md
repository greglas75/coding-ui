# Refactoring Plan

## CRITICAL

### 1. Virtualize `CodingGrid` table rendering
- **File / Lines**: `src/components/CodingGrid/index.tsx` `L1024-L1107`, `L1111-L1145`
- **Current snippet**
```1024:1107:src/components/CodingGrid/index.tsx
      {/* Desktop Table */}
      <div className="hidden md:block relative overflow-auto max-h-[60vh]" data-grid-container>
        <table className="w-full border-collapse min-w-[900px]">
          <TableHeader ... />
          <tbody data-answer-container>
            {localAnswers.map((answer) => (
              <DesktopRow key={answer.id} answer={answer} ... />
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3 p-4" data-grid-container>
        {localAnswers.map((answer) => (
          <MobileCard key={answer.id} answer={answer} ... />
        ))}
      </div>
```
- **Problem**: Both desktop table and hidden mobile cards render *all* answers with no virtualization. With 10k answers this generates 20k rows, causing DOM bloat, 100% CPU spikes, and long render times. A dedicated `VirtualizedTable` exists but is unused.
- **Refactor**: Replace the `<tbody>` map with the existing `VirtualizedTable` (react-window) and gate the mobile list behind a virtualized card list or pagination. Move shared row callbacks into memoized hooks to avoid re-renders.
- **Effort**: Large (touches main workflow, needs QA on shortcuts/batch selection).
- **Benefit**: ~80% reduction in DOM nodes, smoother scrolling, enables handling 10k+ answers without freezing.

### 2. Decompose `categorizeAnswer` service
- **File / Lines**: `src/lib/openai.ts` `L97-L216` (extends through 1,000+ lines)
- **Current snippet**
```97:216:src/lib/openai.ts
export async function categorizeAnswer(request: CategorizeRequest): Promise<CategorizeResponse> {
  const { model = 'gpt-4o-mini' } = request;
  let provider: 'openai' | 'anthropic' | 'google' = 'openai';
  ...
  return openaiRateLimiter.add(
    () =>
      retryWithBackoff(
        async () => {
          try {
            // Step 1: Multi-Source Brand Validation
            let webContext: WebContext[] = [];
            let images: ImageResult[] = [];
            let visionResult: any = null;
            let multiSourceResult: MultiSourceValidationResult | null = null;
            ...
            if (!multiSourceResult) {
              const _webContextText = await buildWebContextSection(localizedQuery, { enabled: true, numResults: 6 });
              const { googleSearch } = await import('../services/webContextProvider');
              webContext = await googleSearch(localizedQuery, { numResults: 6 });
              images = await googleImageSearch(localizedQuery, 6);
              ...
```
- **Problem**: Single function exceeds 1,200 lines, mixing provider detection, rate limiting, multi-source enrichment, prompt building, and result formatting. Cyclomatic complexity > 30, no separation of concerns, impossible to test in isolation, and blocking network calls happen sequentially on the client.
- **Refactor**: Introduce provider strategy classes (`OpenAIProvider`, `AnthropicProvider`, etc.), a dedicated `MultiSourceValidator` module, and an orchestrator that composes them. Move web context + vision calls server-side or wrap them in async utilities executed via `Promise.all`.
- **Effort**: Large (core AI workflow, requires regression tests).
- **Benefit**: Major maintainability boost, clearer failure handling, opens door for streaming/batching improvements, easier unit testing.

### 3. Fix N+1 & pagination gaps in `CodeListPage`
- **File / Lines**: `src/pages/CodeListPage.tsx` `L55-L160`
- **Current snippet**
```55:160:src/pages/CodeListPage.tsx
async function fetchCodes() {
  let query = supabase.from('codes').select('*').order('name');
  if (searchText.trim()) {
    query = query.ilike('name', `%${searchText.trim()}%`);
  }
  const { data: codesData } = await query;
  const { data: relationsData } = await supabase.from('codes_categories').select('code_id, category_id');
  ...
  const counts = await fetchCodeUsageCounts(codesWithCategories);
}
async function fetchCodeUsageCounts(codes: CodeWithCategories[]) {
  for (const code of codes) {
    const { count } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .or(`selected_code.ilike.%${code.name}%, ...`);
    countsMap[code.id] = count || 0;
  }
}
```
- **Problem**: Every filter change fetches entire `codes`, `codes_categories`, then issues one count query per code (hundreds/thousands of sequential requests) on the UI thread. No pagination or debouncing leads to massive payloads and UI freezes.
- **Refactor**: Move data access into TanStack Query hooks backed by Supabase RPCs: `get_codes(page, limit, filters)` returning aggregated usage counts in one query. Add 300 ms debounce for text filters, use pagination/infinite scroll, and memoize results.
- **Effort**: Large (new RPC + significant UI changes).
- **Benefit**: Dramatically faster loading, lower Supabase costs, enables large codebases without blocking the browser.

## HIGH PRIORITY

### 4. Break up `src/lib/supabase.ts`
- **File / Lines**: `src/lib/supabase.ts` `L1-L114` (entire 900-line module)
- **Current snippet**
```1:80:src/lib/supabase.ts
let supabaseInstance: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient { ... }
export const supabase = getSupabaseClient();
export async function fetchCodes() { ... }
export async function createCode(name: string) { ... }
export async function saveCodesForAnswer(...) { ... }
```
- **Problem**: Client bootstrap, generic CRUD helpers, caching, pagination, and domain-specific logic all live in one file. Any import drags in the entire module, hurting bundle size and obscuring ownership boundaries.
- **Refactor**: Create `supabaseClient.ts` for the singleton, then domain repositories (`repositories/codes.ts`, `repositories/answers.ts`, etc.) and shared utilities (cache, pagination). Export typed functions per domain for easier testing and tree-shaking.
- **Effort**: Medium–Large.
- **Benefit**: Cleaner architecture, smaller bundles, clearer ownership for future migrations (e.g., swapping persistence layer).

### 5. Separate data + UI in `SelectCodeModal`
- **File / Lines**: `src/components/SelectCodeModal.tsx` `L37-L179`
- **Current snippet**
```37:142:src/components/SelectCodeModal.tsx
export function SelectCodeModal({...}: SelectCodeModalProps) {
  const [codes, setCodes] = useState(...);
  const [codesCache, setCodesCache] = useState(...);
  const [suggestionEngine] = useState(() => CodeSuggestionEngine.create());
  useEffect(() => { if (codesCache.has(_categoryId)) ... else fetch via supabase }, [...]);
  useEffect(() => { suggestionEngine.initialize(_categoryId); ... setSuggestions(...) }, [...]);
```
- **Problem**: Modal component owns Supabase fetching, caching, AI suggestion engine lifecycle, and UI state all at once. Effects depend on large dependency lists, making re-renders expensive and logic hard to test.
- **Refactor**: Extract hooks (`useCodes(categoryId)`, `useCodeSuggestions(answerId, categoryId)`) and services for Supabase calls + suggestion engine. Keep the modal as a presentational shell consuming those hooks, with memoized props.
- **Effort**: Medium.
- **Benefit**: Reduced re-render churn, easier unit tests, improved readability, potential to reuse hooks elsewhere.

### 6. Split `CodeframeBuilderModal` responsibilities
- **File / Lines**: `src/components/CodeframeBuilderModal.tsx` `L90-L209`
- **Current snippet**
```90:209:src/components/CodeframeBuilderModal.tsx
const handleSaveManualCodes = async () => { await axios.post('/api/v1/codes/bulk-create', ...); }
const handleDiscoverCodes = async () => {
  const discoverResponse = await axios.post('/api/v1/codes/ai-discover', ...);
  const verifyResponse = await axios.post('/api/v1/codes/verify-brands', ...);
  ...
}
const handleSaveDiscoveredCodes = async () => { await axios.post('/api/v1/codes/bulk-create', ...); }
```
- **Problem**: One component coordinates manual entry, AI discovery, verification, Excel paste, and persistence, each with large inline handlers and repeated toast/logging logic. Hard to extend and nearly impossible to unit test.
- **Refactor**: Create tab-specific child components (`ManualCodesPanel`, `AIDiscoveryPanel`, `PasteImportPanel`) plus a `useCodeDiscovery` hook that encapsulates API calls, progress, and toast behavior.
- **Effort**: Medium.
- **Benefit**: Better separation of concerns, easier to iterate on individual flows, simplifies Storybook coverage.

## MEDIUM PRIORITY

### 7. Externalize whitelist data from `cacheLayer`
- **File / Lines**: `src/services/cacheLayer.ts` `L12-L86`
- **Current snippet**
```12:86:src/services/cacheLayer.ts
const DEFAULT_WHITELIST = [
  'GCash','Maya','PayPal', ... 'Sensodyne','Closeup','Pepsodent','Oral-B','Yes','No','Other','Not applicable'
];
let customWhitelist: string[] = [];
```
- **Problem**: Large static whitelist data is bundled with runtime cache logic, so updating the list requires a deploy and increases initial bundle size. No typing/validation of entries.
- **Refactor**: Move whitelist entries to a config JSON or Supabase table, load them via repository function at startup, and keep `cacheLayer` focused on behavior. Add Zod validation for loaded data.
- **Effort**: Medium.
- **Benefit**: Smaller bundles, easier whitelist updates, clearer separation between configuration and logic.

### 8. Guard debug helpers in `geminiVision`
- **File / Lines**: `src/services/geminiVision.ts` `L400-L423`
- **Current snippet**
```400:423:src/services/geminiVision.ts
export function clearCorsBlacklist(): void { ... }
export function viewCorsBlacklist(): string[] { ... }
if (typeof window !== 'undefined') {
  (window as any).clearCorsBlacklist = clearCorsBlacklist;
  (window as any).viewCorsBlacklist = viewCorsBlacklist;
}
```
- **Problem**: Exposes helper functions globally in production builds, leaking internals and enabling unintended behavior if third-party scripts access `window`.
- **Refactor**: Wrap the window exposure behind `if (import.meta.env.DEV)` or remove entirely, providing a dedicated debug panel instead.
- **Effort**: Small.
- **Benefit**: Improves security posture and keeps production globals clean.

### 9. Deduplicate approval/rejection logic in `CodeframeTree`
- **File / Lines**: `src/components/CodeframeBuilder/TreeEditor/CodeframeTree.tsx` `L100-L165`
- **Current snippet**
```100:165:src/components/CodeframeBuilder/TreeEditor/CodeframeTree.tsx
const handleApprove = useCallback(async () => {
  const response = await fetch(`/api/.../${selectedBrandNode.id}/approval`, { body: JSON.stringify({ status: 'approved' }) });
  ...
});
const handleReject = useCallback(async () => {
  const response = await fetch(`/api/.../${selectedBrandNode.id}/approval`, { body: JSON.stringify({ status: 'rejected' }) });
  ...
});
```
- **Problem**: Nearly identical functions for approve/reject duplicate fetch/error-handling logic, increasing maintenance cost and risk of divergent behavior.
- **Refactor**: Extract `updateBrandApproval(status)` helper that handles API interaction and navigation, called by both buttons. Surface toast feedback instead of `alert`.
- **Effort**: Small.
- **Benefit**: Less duplication, consistent UX, easier instrumentation.

## LOW PRIORITY

### 10. Reduce noisy logging in global click handler
- **File / Lines**: `src/components/CodingGrid/index.tsx` `L392-L409`
- **Current snippet**
```392:405:src/components/CodingGrid/index.tsx
const handleGlobalClick = (event: MouseEvent) => {
  ...
  if (focusedRowId) {
    simpleLogger.info('🧹 Clearing focus - clicked outside grid');
    setFocusedRowId(null);
  }
};
document.addEventListener('click', handleGlobalClick);
```
- **Problem**: `simpleLogger.info` fires on every outside click in production, flooding logs during normal use and adding overhead to a hot path.
- **Refactor**: Guard logs behind `if (import.meta.env.DEV)` or remove them, leaving only state updates.
- **Effort**: Small.
- **Benefit**: Cleaner logs and slight performance improvement on user interactions.

---

Priorities above align with the requested categories. Critical items unblock scalability and AI correctness; high-priority changes tackle large maintainability wins; medium items address configuration hygiene and duplication; low priorities polish logging noise.

