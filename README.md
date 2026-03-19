# schema-info

Universal schema introspection for TypeScript validation libraries.

Extract field metadata (type, optionality, nullability, defaults, enum values) from schemas created with Zod, Yup, Valibot, ArkType, Effect Schema, or Joi — using a single function.

## Features

- Zero dependencies
- Supports 6 schema libraries out of the box
- Auto-detects which library produced a schema
- ESM and CommonJS builds
- Full TypeScript support with exported types
- Returns a consistent `SchemaInfo` object regardless of the source library

## Installation

```bash
npm install schema-info
# or
pnpm add schema-info
# or
yarn add schema-info
```

## Quick Start

```ts
import { schemaInfo } from 'schema-info'
```

Pass any schema field from any supported library — the library is detected automatically:

```ts
import * as z from 'zod'

schemaInfo(z.string())
// { type: 'string', optional: false, nullable: false }

schemaInfo(z.number().optional().nullable())
// { type: 'number', optional: true, nullable: true }

schemaInfo(z.string().default('hello'))
// { type: 'string', optional: false, nullable: false, getDefaultValue: [Function] }

schemaInfo(z.enum(['a', 'b', 'c']))
// { type: 'enum', optional: false, nullable: false, enumValues: ['a', 'b', 'c'] }
```

Works the same way with every supported library:

```ts
import * as yup from 'yup'
import * as v from 'valibot'
import { type } from 'arktype'
import { Schema } from 'effect'
import Joi from 'joi'

schemaInfo(yup.string().required())
// { type: 'string', optional: false, nullable: false }

schemaInfo(v.optional(v.number(), 42))
// { type: 'number', optional: true, nullable: false, getDefaultValue: [Function] }

schemaInfo(type('string | null'))
// { type: 'string', optional: false, nullable: true }

schemaInfo(Schema.NullishOr(Schema.Boolean))
// { type: 'boolean', optional: true, nullable: true }

schemaInfo(Joi.date().required().allow(null))
// { type: 'date', optional: false, nullable: true }
```

## API

### `schemaInfo(schema?)`

Extract field metadata from a schema produced by any supported validation library. The library is detected automatically by inspecting the schema object's internal structure.

```ts
schemaInfo(schema?: unknown): SchemaInfo
```

Returns `{ type: null, optional: false, nullable: false }` for `undefined`, unsupported schemas, or unrecognized values.

This library introspects **scalar field types** only. Compound types like objects, arrays, and tuples return `type: null`:

```ts
schemaInfo(z.object({ name: z.string() }))
// { type: null, optional: false, nullable: false }

schemaInfo(z.array(z.number()))
// { type: null, optional: false, nullable: false }
```

### `schemaFields(schema)`

Extract field metadata from an **object** schema. Takes a schema that defines an object shape and returns a record mapping each field name to its `SchemaInfo`. Automatically unwraps transforms, pipes, refinements, and other wrappers to find the underlying object.

```ts
schemaFields(schema: unknown): Record<string, SchemaInfo> | null
```

Returns `null` if the schema is not a recognized object type.

```ts
import { schemaFields } from 'schema-info'
import * as z from 'zod'

const fields = schemaFields(z.object({
  name: z.string(),
  age: z.number().optional(),
  role: z.enum(['admin', 'user']),
}))
// {
//   name: { type: 'string', optional: false, nullable: false },
//   age: { type: 'number', optional: true, nullable: false },
//   role: { type: 'enum', optional: false, nullable: false, enumValues: ['admin', 'user'] },
// }
```

Works with wrapped schemas (transforms, pipes, refinements):

```ts
const schema = z.object({ name: z.string() }).transform((v) => v)
schemaFields(schema)
// { name: { type: 'string', optional: false, nullable: false } }
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

## What Gets Extracted

| Property | Type | Description |
| --- | --- | --- |
| `type` | `FieldType \| null` | `'string'`, `'number'`, `'boolean'`, `'date'`, `'enum'`, or `null` for unsupported types |
| `optional` | `boolean` | Whether the field accepts `undefined` |
| `nullable` | `boolean` | Whether the field accepts `null` |
| `getDefaultValue` | `(() => unknown) \| undefined` | A function that returns the default value, if one is set |
| `enumValues` | `string[] \| undefined` | The allowed values for enum fields |

## Types

All types are exported for use in your own code:

```ts
import type { SchemaInfo, FieldType } from 'schema-info'
```

**`FieldType`** — `'string' | 'number' | 'boolean' | 'date' | 'enum'`

**`SchemaInfo`** — The universal output type:

```ts
type SchemaInfo = {
  type: FieldType | null
  optional: boolean
  nullable: boolean
  getDefaultValue?: () => unknown
  enumValues?: string[]
}
```

## License

[MIT](LICENSE.md)
