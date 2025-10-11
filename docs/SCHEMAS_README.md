# 📋 Zod Schemas - Runtime Data Validation

This directory contains Zod schemas for runtime validation of API responses and data structures.

## 🎯 Why Zod?

- ✅ **Runtime validation** - catch invalid data before it causes bugs
- ✅ **Type inference** - automatic TypeScript types from schemas
- ✅ **Better error messages** - clear validation errors
- ✅ **Type safety** - ensures API responses match expectations

## 📚 Available Schemas

### Common Schemas (`common.ts`)
Base schemas used across the application:
- `DateTimeSchema` - ISO 8601 datetime strings
- `IdSchema` - positive integer IDs
- `NonEmptyStringSchema` - required strings
- `EmailSchema` - email validation
- `PaginationSchema` - pagination parameters

### Category Schemas (`categorySchema.ts`)
```typescript
import { parseCategory, parseCategories } from './schemas/categorySchema';

// Single category
const category = parseCategory(apiResponse);

// Array of categories
const categories = parseCategories(apiResponse);

// Safe parsing (no throw)
const result = safeParseCategory(data);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### Code Schemas (`codeSchema.ts`)
```typescript
import { parseCode, parseCodes } from './schemas/codeSchema';

const code = parseCode(apiResponse);
const codes = parseCodes(apiResponse);
```

### Answer/Segment Schemas (`answerSchema.ts`)
```typescript
import { parseAnswer, parseAnswers } from './schemas/answerSchema';

const answer = parseAnswer(apiResponse);
const answers = parseAnswers(apiResponse);
```

### Project Schemas (`projectSchema.ts`)
```typescript
import { parseProject, parseProjects } from './schemas/projectSchema';

const project = parseProject(apiResponse);
const projects = parseProjects(apiResponse);
```

### Import Package Schemas (`importPackageSchema.ts`)
```typescript
import {
  parseImportPackage,
  parseFileUploadResponse
} from './schemas/importPackageSchema';

const importPackage = parseImportPackage(apiResponse);
const uploadResult = parseFileUploadResponse(apiResponse);
```

## 🔧 Usage with API Client

### Automatic Validation

The API client supports automatic validation using the `schema` option:

```typescript
import { apiClient } from './services/apiClient';
import { CategorySchema } from './schemas/categorySchema';
import { z } from 'zod';

// Automatic validation on response
const response = await apiClient.get<Category>('/api/categories/1', {
  schema: CategorySchema
});

// If validation fails, an error is thrown
// If validation succeeds, data is guaranteed to match the schema
console.log(response.data); // Type-safe Category object
```

### Array Validation

```typescript
import { z } from 'zod';
import { CodeSchema } from './schemas/codeSchema';

const response = await apiClient.get<Code[]>('/api/codes', {
  schema: z.array(CodeSchema)
});
```

### Manual Validation

```typescript
import { parseCategory } from './schemas/categorySchema';

try {
  const category = parseCategory(unknownData);
  // Use validated category
} catch (error) {
  console.error('Validation failed:', error);
}
```

### Safe Parsing (No Throw)

```typescript
import { safeParseCategory } from './schemas/categorySchema';

const result = safeParseCategory(unknownData);

if (result.success) {
  // result.data is validated
  console.log(result.data);
} else {
  // result.error contains validation errors
  console.error(result.error.issues);
}
```

## 📝 Creating New Schemas

### 1. Define the schema

```typescript
import { z } from 'zod';
import { IdSchema, NonEmptyStringSchema } from './common';

export const MyEntitySchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema,
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
  tags: z.array(z.string()).optional(),
});
```

### 2. Export type

```typescript
export type MyEntity = z.infer<typeof MyEntitySchema>;
```

### 3. Create parser functions

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

### 4. Use with API client

```typescript
import { apiClient } from './services/apiClient';
import { MyEntitySchema } from './schemas/myEntitySchema';

const response = await apiClient.get<MyEntity>('/api/my-entity/1', {
  schema: MyEntitySchema
});
```

## 🎨 Best Practices

1. **Always validate external data** - API responses, user input, localStorage
2. **Use type inference** - let Zod generate TypeScript types
3. **Compose schemas** - reuse common schemas
4. **Safe parse for user input** - use `safeParse` to avoid throwing
5. **Strict parse for APIs** - use `parse` to throw on invalid data
6. **Add descriptions** - document schemas with `.describe()`

## 🔍 Validation Error Handling

```typescript
import { z } from 'zod';

try {
  const data = CategorySchema.parse(unknownData);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation errors:', error.issues);
    // error.issues contains detailed validation errors
    error.issues.forEach(issue => {
      console.log(`${issue.path}: ${issue.message}`);
    });
  }
}
```

## 📦 Schema Organization

```
src/schemas/
├── index.ts                  # Re-exports all schemas
├── common.ts                 # Shared base schemas
├── categorySchema.ts         # Category validation
├── codeSchema.ts            # Code validation
├── answerSchema.ts          # Answer/Segment validation
├── projectSchema.ts         # Project validation
├── importPackageSchema.ts   # Import package validation
└── README.md                # This file
```

## 🚀 Benefits

- **Type Safety** - Catch type errors at runtime
- **Documentation** - Schemas serve as documentation
- **Validation** - Automatic validation of API responses
- **Maintainability** - Centralized data definitions
- **Error Prevention** - Catch invalid data before it causes bugs

## 📖 Learn More

- [Zod Documentation](https://zod.dev/)
- [TypeScript Integration](https://zod.dev/?id=type-inference)
- [Error Handling](https://zod.dev/?id=error-handling)

