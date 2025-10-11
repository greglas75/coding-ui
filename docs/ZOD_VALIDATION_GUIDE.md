# 📋 Zod Validation Integration Guide

## ✅ What Has Been Implemented

### 1. Zod Schemas (`src/schemas/`)

Created comprehensive validation schemas for all major data types:

- **`common.ts`** - Base schemas (ID, DateTime, Email, etc.)
- **`categorySchema.ts`** - Category validation and parsing
- **`codeSchema.ts`** - Code validation and parsing
- **`answerSchema.ts`** - Answer/Segment validation and parsing
- **`projectSchema.ts`** - Project validation and parsing
- **`importPackageSchema.ts`** - Import package validation and parsing

### 2. API Client Integration

The API client (`src/services/apiClient.ts`) now supports automatic Zod validation:

```typescript
// RequestOptions now includes optional schema parameter
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
  schema?: ZodSchema; // ✨ NEW: Automatic validation
}
```

### 3. Automatic Validation in Requests

The API client automatically validates responses when a schema is provided:

```typescript
// In apiClient.request() method:
if (schema) {
  try {
    data = schema.parse(data) as T;
    console.log('✅ Data validated with Zod schema');
  } catch (validationError) {
    console.error('❌ Zod validation failed:', validationError);
    throw new Error(`Data validation failed: ${validationError}`);
  }
}
```

## 🚀 Usage Examples

### Example 1: Fetch Categories with Validation

```typescript
import { apiClient } from './services/apiClient';
import { CategorySchema } from './schemas/categorySchema';
import { z } from 'zod';

// Automatic validation for single category
const response = await apiClient.get<Category>('/api/categories/1', {
  schema: CategorySchema
});
// response.data is now validated and type-safe

// Automatic validation for array of categories
const categoriesResponse = await apiClient.get<Category[]>('/api/categories', {
  schema: z.array(CategorySchema)
});
```

### Example 2: Upload File with Validated Response

```typescript
import { uploadFile } from './services/apiClient';

// Automatically validates FileUploadResponse
const result = await uploadFile(file, categoryId);
// result is validated with FileUploadResponseSchema
```

### Example 3: Manual Validation in Components

```typescript
import { parseCategory, safeParseCategory } from './schemas/categorySchema';

// Throws on validation failure
try {
  const category = parseCategory(apiResponse);
  console.log('Valid category:', category);
} catch (error) {
  console.error('Invalid data:', error);
}

// Safe parsing (no throw)
const result = safeParseCategory(unknownData);
if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.error('Invalid:', result.error.issues);
}
```

### Example 4: Supabase Data Validation

```typescript
import { parseCategories } from './schemas/categorySchema';

export const fetchCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*');

  if (error) return { success: false, error };

  // Validate with Zod
  try {
    const validatedData = parseCategories(data);
    return { success: true, data: validatedData };
  } catch (validationError) {
    return { success: false, error: validationError };
  }
};
```

## 📊 Schema Features

### Type Inference

```typescript
import { z } from 'zod';
import { CategorySchema } from './schemas/categorySchema';

// Automatic TypeScript type from schema
type Category = z.infer<typeof CategorySchema>;
```

### Composable Schemas

```typescript
import { IdSchema, NonEmptyStringSchema } from './schemas/common';

const MySchema = z.object({
  id: IdSchema,               // Reuse base schemas
  name: NonEmptyStringSchema,
  tags: z.array(z.string()),
});
```

### Optional and Nullable Fields

```typescript
const AnswerSchema = z.object({
  id: IdSchema,
  text: NonEmptyStringSchema,
  translation: z.string().nullable().optional(),
  category_id: IdSchema.nullable().optional(),
});
```

### Enums and Literals

```typescript
const StatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);

const ModeSchema = z.literal('production').or(z.literal('development'));
```

## 🛡️ Error Handling

### Zod Validation Errors

```typescript
import { z } from 'zod';

try {
  CategorySchema.parse(invalidData);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation issues:');
    error.issues.forEach(issue => {
      console.log(`- ${issue.path.join('.')}: ${issue.message}`);
    });
  }
}
```

### API Client Error Handling

```typescript
try {
  const response = await apiClient.get<Category>('/api/categories/1', {
    schema: CategorySchema
  });
} catch (error) {
  if (error.statusText === 'Validation Error') {
    console.error('Response data is invalid:', error.message);
  } else {
    console.error('API error:', error);
  }
}
```

## 📝 Creating New Schemas

### Step 1: Define Schema

```typescript
// src/schemas/myEntitySchema.ts
import { z } from 'zod';
import { IdSchema, DateTimeSchema } from './common';

export const MyEntitySchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(255),
  email: z.string().email(),
  created_at: DateTimeSchema,
});
```

### Step 2: Export Types

```typescript
export type MyEntity = z.infer<typeof MyEntitySchema>;
```

### Step 3: Create Parsers

```typescript
export function parseMyEntity(data: unknown): MyEntity {
  return MyEntitySchema.parse(data);
}

export function parseMyEntities(data: unknown): MyEntity[] {
  return z.array(MyEntitySchema).parse(data);
}

export function safeParseMyEntity(data: unknown) {
  return MyEntitySchema.safeParse(data);
}
```

### Step 4: Export from Index

```typescript
// src/schemas/index.ts
export * from './myEntitySchema';
```

## 🎯 Benefits

1. **Runtime Safety** - Catch invalid data before it causes bugs
2. **Type Safety** - Automatic TypeScript types from schemas
3. **Better Errors** - Clear validation error messages
4. **Documentation** - Schemas serve as living documentation
5. **API Contract Validation** - Ensure backend matches expectations
6. **Reduced Bugs** - Prevent invalid data from propagating

## 📚 Already Implemented

✅ All major schemas created (Category, Code, Answer, Project, ImportPackage)
✅ API client supports automatic validation
✅ File upload validates responses
✅ `fetchCategories` uses validation
✅ Type inference from schemas
✅ Error handling for validation failures

## 🔜 Next Steps

To add validation to more API calls:

1. Import the appropriate schema
2. Add `schema` parameter to API client calls
3. Handle validation errors appropriately

Example:

```typescript
// Before
const data = await apiClient.get<Code[]>('/api/codes');

// After (with validation)
import { CodeSchema } from './schemas/codeSchema';
import { z } from 'zod';

const data = await apiClient.get<Code[]>('/api/codes', {
  schema: z.array(CodeSchema)
});
```

## 📖 Resources

- [Zod Documentation](https://zod.dev/)
- [Schema README](../src/schemas/README.md)
- [API Client Code](../src/services/apiClient.ts)
- [Example Schemas](../src/schemas/)

## 🎉 Summary

The Zod validation system is **fully integrated** and ready to use! All schemas are created, the API client supports automatic validation, and examples show how to use it throughout the application.

