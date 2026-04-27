import { expectTypeOf, test } from 'vitest'
import { collapseUnionScalars } from './types'
import type {
  ArraySchemaInfo,
  ObjectSchemaInfo,
  RecursiveSchemaInfo,
  ScalarSchemaInfo,
  SchemaInfo,
  UnionSchemaInfo,
} from './types'

test('SchemaInfo narrows to UnionSchemaInfo on type === "union"', () => {
  const narrow = (info: SchemaInfo) => {
    if (info.type === 'union') {
      expectTypeOf(info).toEqualTypeOf<UnionSchemaInfo>()
      expectTypeOf(info.options).toEqualTypeOf<SchemaInfo[]>()
      expectTypeOf(info.discriminator).toEqualTypeOf<string | undefined>()
    }
  }
  expectTypeOf(narrow).toBeFunction()
})

test('SchemaInfo narrows to RecursiveSchemaInfo on type === "recursive"', () => {
  const narrow = (info: SchemaInfo) => {
    if (info.type === 'recursive') {
      expectTypeOf(info).toEqualTypeOf<RecursiveSchemaInfo>()
    }
  }
  expectTypeOf(narrow).toBeFunction()
})

test('SchemaInfo narrows to ArraySchemaInfo on type === "array"', () => {
  const narrow = (info: SchemaInfo) => {
    if (info.type === 'array') {
      expectTypeOf(info).toEqualTypeOf<ArraySchemaInfo>()
      expectTypeOf(info.item).toEqualTypeOf<SchemaInfo>()
    }
  }
  expectTypeOf(narrow).toBeFunction()
})

test('SchemaInfo narrows to ObjectSchemaInfo on type === "object"', () => {
  const narrow = (info: SchemaInfo) => {
    if (info.type === 'object') {
      expectTypeOf(info).toEqualTypeOf<ObjectSchemaInfo>()
      expectTypeOf(info.fields).toEqualTypeOf<Record<string, SchemaInfo>>()
    }
  }
  expectTypeOf(narrow).toBeFunction()
})

test('SchemaInfo narrows scalar variants to ScalarSchemaInfo', () => {
  const narrow = (info: SchemaInfo) => {
    if (
      info.type === 'string' ||
      info.type === 'number' ||
      info.type === null
    ) {
      expectTypeOf(info).toMatchTypeOf<ScalarSchemaInfo>()
    }
    if (info.type === 'enum') {
      expectTypeOf(info.enumValues).toEqualTypeOf<string[] | undefined>()
    }
  }
  expectTypeOf(narrow).toBeFunction()
})

test('collapseUnionScalars returns SchemaInfo | null', () => {
  const result = collapseUnionScalars([
    { type: 'number', optional: false, nullable: false },
    { type: 'number', optional: false, nullable: false },
  ])
  expectTypeOf(result).toEqualTypeOf<SchemaInfo | null>()
})
