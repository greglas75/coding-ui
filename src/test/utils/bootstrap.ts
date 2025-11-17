import { vi } from 'vitest';

type SupabaseMock = {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  auth: {
    getSession: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
  };
};

function createSupabaseMock(): SupabaseMock {
  const supabaseMock: any = {};
  supabaseMock.from = vi.fn(() => supabaseMock);
  supabaseMock.select = vi.fn(() => supabaseMock);
  supabaseMock.insert = vi.fn(() => supabaseMock);
  supabaseMock.update = vi.fn(() => supabaseMock);
  supabaseMock.delete = vi.fn(() => supabaseMock);
  supabaseMock.eq = vi.fn(() => supabaseMock);
  supabaseMock.in = vi.fn(() => supabaseMock);
  supabaseMock.order = vi.fn(() => supabaseMock);
  supabaseMock.neq = vi.fn(() => supabaseMock);
  supabaseMock.is = vi.fn(async () => ({ data: [], error: null }));
  supabaseMock.range = vi.fn(async () => ({ data: [], error: null }));
  supabaseMock.single = vi.fn(() => ({ data: null, error: null }));
  supabaseMock.rpc = vi.fn(() => ({ data: null, error: null }));
  supabaseMock.auth = {
    getSession: vi.fn(() => ({ data: { session: null }, error: null })),
    getUser: vi.fn(() => ({ data: { user: null }, error: null })),
  };

  return supabaseMock as SupabaseMock;
}

const supabaseMock = createSupabaseMock();

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => supabaseMock,
  supabase: supabaseMock,
}));

function resetSupabaseMock(): void {
  const chainMethods: Array<keyof SupabaseMock> = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'in', 'order'];
  chainMethods.forEach(method => {
    supabaseMock[method].mockReset();
    supabaseMock[method].mockImplementation(() => supabaseMock);
  });

  supabaseMock.range.mockReset();
  supabaseMock.range.mockImplementation(async () => ({ data: [], error: null }));

  supabaseMock.neq.mockReset();
  supabaseMock.neq.mockImplementation(() => supabaseMock);

  supabaseMock.is.mockReset();
  supabaseMock.is.mockImplementation(async () => ({ data: [], error: null }));

  supabaseMock.single.mockReset();
  supabaseMock.single.mockImplementation(() => ({ data: null, error: null }));

  supabaseMock.rpc.mockReset();
  supabaseMock.rpc.mockImplementation(() => ({ data: null, error: null }));

  supabaseMock.auth.getSession.mockReset();
  supabaseMock.auth.getSession.mockImplementation(() => ({ data: { session: null }, error: null }));

  supabaseMock.auth.getUser.mockReset();
  supabaseMock.auth.getUser.mockImplementation(() => ({ data: { user: null }, error: null }));
}

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

export function bootstrapTestEnvironment() {
  resetSupabaseMock();

  Object.defineProperty(window, 'localStorage', {
    value: createStorageMock(),
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: window.localStorage,
    configurable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: createStorageMock(),
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: window.sessionStorage,
    configurable: true,
  });
}

