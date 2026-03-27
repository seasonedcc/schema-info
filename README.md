# schema-info

Universal schema introspection for TypeScript validation libraries.

Extract field metadata (type, optionality, nullability, defaults, enum values) from schemas created with Zod, Yup, Valibot, ArkType, Effect Schema, or Joi — including nested objects and arrays.

## Features

- Zero dependencies
- Supports 6 schema libraries out of the box
- Auto-detects which library produced a schema
- Recursive introspection of arrays and nested objects
- Discriminated union types for type-safe access
- ESM and CommonJS builds

## Installation

```bash
npm install schema-info
# or
pnpm add schema-info
# or
yarn add schema-info
```

## Quick Start

Pass an object schema from any supported library and get back metadata for every field:

```ts
import { schemaFields } from 'schema-info'
import * as z from 'zod'

const fields = schemaFields(z.object({
  name: z.string(),
  age: z.number().optional(),
  role: z.enum(['admin', 'user']),
  avatar: z.instanceof(File),
  tags: z.array(z.string()),
  billing: z.object({ street: z.string(), city: z.string() }),
}))
// {
//   name: { type: 'string', optional: false, nullable: false },
//   age: { type: 'number', optional: true, nullable: false },
//   role: { type: 'enum', enumValues: ['admin', 'user'], ... },
//   avatar: { type: 'file', ... },
//   tags: { type: 'array', item: { type: 'string', ... }, ... },
//   billing: { type: 'object', fields: { street: { type: 'string', ... }, city: { type: 'string', ... } }, ... },
// }
```

The library is detected automatically — works the same way with every supported library:

```ts
import * as yup from 'yup'
import * as v from 'valibot'
import { type } from 'arktype'
import { Schema } from 'effect'
import Joi from 'joi'

schemaFields(yup.object({ name: yup.string().required(), age: yup.number() }))
schemaFields(v.object({ name: v.string(), age: v.optional(v.number()) }))
schemaFields(type({ name: 'string', 'age?': 'number' }))
schemaFields(Schema.Struct({ name: Schema.String, age: Schema.optional(Schema.Number) }))
schemaFields(Joi.object({ name: Joi.string().required(), age: Joi.number() }))
```

## API

### `schemaFields(schema)`

Extract field metadata from an object schema. Takes a schema that defines an object shape and returns a record mapping each field name to its `SchemaInfo`. Automatically unwraps transforms, pipes, refinements, and other wrappers to find the underlying object.

```ts
schemaFields(schema: unknown): Record<string, SchemaInfo>
```

Throws a `SchemaFieldsError` when the schema is unrecognized or not an object type:

```ts
import { schemaFields, SchemaFieldsError } from 'schema-info'

try {
  schemaFields(z.string()) // not an object schema
} catch (error) {
  if (error instanceof SchemaFieldsError) {
    error.reason  // 'not-object'
    error.library // 'Zod'
  }
}
```

Works with wrapped schemas (transforms, pipes, refinements):

```ts
const schema = z.object({ name: z.string() }).transform((v) => v)
schemaFields(schema)
// { name: { type: 'string', optional: false, nullable: false } }
```

Nested objects and arrays are recursively introspected:

```ts
const fields = schemaFields(z.object({
  addresses: z.array(z.object({
    street: z.string(),
    city: z.string(),
  })),
}))

fields.addresses.type           // 'array'
fields.addresses.item.type      // 'object'
fields.addresses.item.fields    // { street: SchemaInfo, city: SchemaInfo }
```

### `schemaInfo(schema?)`

Extract metadata from an **individual** schema — scalars, arrays, or objects.

```ts
schemaInfo(schema?: unknown): SchemaInfo
```

Returns `{ type: null, optional: false, nullable: false }` for `undefined`, unsupported schemas, or unrecognized values.

```ts
import { schemaInfo } from 'schema-info'

schemaInfo(z.string())
// { type: 'string', optional: false, nullable: false }

schemaInfo(z.number().optional().nullable())
// { type: 'number', optional: true, nullable: true }

schemaInfo(z.string().default('hello'))
// { type: 'string', optional: false, nullable: false, getDefaultValue: [Function] }

schemaInfo(z.enum(['a', 'b', 'c']))
// { type: 'enum', optional: false, nullable: false, enumValues: ['a', 'b', 'c'] }

schemaInfo(z.instanceof(File))
// { type: 'file', optional: false, nullable: false }

schemaInfo(z.array(z.string()))
// { type: 'array', item: { type: 'string', ... }, ... }

schemaInfo(z.object({ name: z.string() }))
// { type: 'object', fields: { name: { type: 'string', ... } }, ... }
```

## Supported Libraries

| Library | Versions | Detection |
| --- | --- | --- |
| [Zod](https://zod.dev) | 4+ | `schema._zod.def` |
| [Yup](https://github.com/jquense/yup) | 1.x | `schema.type` + `schema.spec` |
| [Valibot](https://valibot.dev) | 1.x | `~standard.vendor === 'valibot'` |
| [ArkType](https://arktype.io) | 2.x | `~standard.vendor === 'arktype'` |
| [Effect Schema](https://effect.website/docs/schema) | 3.x | `Symbol.for('effect/Schema')` |
| [Joi](https://joi.dev) | 18.x | `Symbol.for('@hapi/joi/schema')` |

## File Type Detection

File and Blob instance schemas are detected as `{ type: 'file' }`, including through refinements:

| Library | Expression |
| --- | --- |
| Zod | `z.instanceof(File)` |
| Valibot | `v.instance(File)` |
| ArkType | `type('File')` |
| Effect Schema | `Schema.instanceOf(File)` |
| Joi | `Joi.object().instance(File)` |
| Yup | `yup.mixed((input): input is File => input instanceof File)` |

`Blob` is also detected as `'file'` in all libraries. Non-file instance checks (e.g., `z.instanceof(RegExp)`) return `{ type: null }`.

## Types

`SchemaInfo` is a discriminated union on `type`. Narrow on `type` to access variant-specific properties:

```ts
import type { SchemaInfo, ArraySchemaInfo, ObjectSchemaInfo } from 'schema-info'

const info = schemaInfo(someSchema)

if (info.type === 'array') {
  info.item   // SchemaInfo — always present
}

if (info.type === 'object') {
  info.fields // Record<string, SchemaInfo> — always present
}
```

### Variants

**`ScalarSchemaInfo`** — type is `'string' | 'number' | 'boolean' | 'date' | 'file' | 'enum' | null`

| Property | Type | Description |
| --- | --- | --- |
| `type` | `ScalarFieldType \| null` | The field type, or `null` for unsupported types |
| `optional` | `boolean` | Whether the field accepts `undefined` |
| `nullable` | `boolean` | Whether the field accepts `null` |
| `getDefaultValue` | `(() => unknown) \| undefined` | Returns the default value, if set |
| `enumValues` | `string[] \| undefined` | Allowed values for enum fields |
| `format` | `FieldFormat \| undefined` | String format (email, url, uuid, etc.) |

**`ArraySchemaInfo`** — type is `'array'`

All scalar properties above, plus:

| Property | Type | Description |
| --- | --- | --- |
| `item` | `SchemaInfo` | Describes the element type |

**`ObjectSchemaInfo`** — type is `'object'`

All scalar properties above, plus:

| Property | Type | Description |
| --- | --- | --- |
| `fields` | `Record<string, SchemaInfo>` | Maps field names to their metadata |

### Exported types

```ts
import type {
  SchemaInfo,
  ArraySchemaInfo,
  ObjectSchemaInfo,
  FieldType,
  ScalarFieldType,
  FieldFormat,
} from 'schema-info'
```

## License

[MIT](LICENSE.md)
