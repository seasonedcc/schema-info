import type { FieldFormat, ScalarFieldType, SchemaInfo } from '../types'
import { collapseUnionScalars } from '../types'

const TypeId = Symbol.for('effect/Schema')
const IdentifierAnnotationId = Symbol.for('effect/annotation/Identifier')

type EffectAST = {
  _tag: string
  literal?: unknown
  types?: EffectAST[]
  from?: EffectAST
  type?: EffectAST
  isOptional?: boolean
  enums?: [string, string | number][]
  annotations?: Record<string | symbol, unknown>
  propertySignatures?: { name: string; type: EffectAST; isOptional: boolean }[]
  rest?: { type: EffectAST }[]
  elements?: unknown[]
  f?: () => EffectAST
}

type EffectSchema = {
  [key: symbol]: unknown
  ast: EffectAST
  from?: EffectSchema
}

function asEffectSchema(schema: unknown): EffectSchema | null {
  const candidate = schema as Partial<EffectSchema>
  if (candidate === null || candidate === undefined) return null
  if (typeof candidate !== 'object' && typeof candidate !== 'function')
    return null
  if (!(TypeId in candidate)) return null
  if (!candidate.ast || typeof candidate.ast._tag !== 'string') return null
  return candidate as EffectSchema
}

/**
 * Detect whether the given value is an Effect Schema.
 *
 * @param schema - Any value to check
 * @returns `true` when the value is an Effect Schema instance
 *
 * @example
 * ```ts
 * import { Schema } from 'effect'
 * isEffectSchema(Schema.String) // true
 * isEffectSchema('hello')       // false
 * ```
 */
function isEffectSchema(schema: unknown): boolean {
  return asEffectSchema(schema) !== null
}

function getIdentifier(ast: EffectAST): string | undefined {
  return ast.annotations?.[IdentifierAnnotationId] as string | undefined
}

function isDateAST(ast: EffectAST): boolean {
  const id = getIdentifier(ast)
  return id === 'Date' || id === 'DateFromSelf'
}

const InstanceOfSchemaId = Symbol.for('effect/SchemaId/InstanceOf')

function isFileAST(ast: EffectAST): boolean {
  // biome-ignore lint/suspicious/noExplicitAny: Effect internal structure
  const instanceOf = ast.annotations?.[InstanceOfSchemaId] as any
  const ctor = instanceOf?.constructor
  return (
    (typeof File !== 'undefined' && ctor === File) ||
    (typeof Blob !== 'undefined' && ctor === Blob)
  )
}

const effectFormatMap: Record<string, FieldFormat> = {
  UUID: 'uuid',
  ULID: 'ulid',
  DateTimeUtc: 'datetime',
}

const tagMap: Record<string, ScalarFieldType> = {
  StringKeyword: 'string',
  NumberKeyword: 'number',
  BooleanKeyword: 'boolean',
}

function extractFromAST(
  ast: EffectAST,
  optional = false,
  nullable = false,
  seen: Set<unknown> = new Set()
): SchemaInfo {
  const { _tag } = ast

  if (tagMap[_tag]) {
    return { type: tagMap[_tag], optional, nullable }
  }

  if (_tag === 'Literal') {
    const lit = ast.literal
    if (typeof lit === 'string') return { type: 'string', optional, nullable }
    if (typeof lit === 'number') return { type: 'number', optional, nullable }
    if (typeof lit === 'boolean') return { type: 'boolean', optional, nullable }
    return { type: null, optional, nullable }
  }

  if (_tag === 'Enums' && ast.enums) {
    return {
      type: 'enum',
      optional,
      nullable,
      enumValues: ast.enums.map(([, value]) => String(value)),
    }
  }

  if (
    (_tag === 'Refinement' ||
      _tag === 'Transformation' ||
      _tag === 'Declaration') &&
    isDateAST(ast)
  ) {
    return { type: 'date', optional, nullable }
  }

  if (_tag === 'Declaration' && isFileAST(ast)) {
    return { type: 'file', optional, nullable }
  }

  const identifier = getIdentifier(ast)
  const format = identifier ? effectFormatMap[identifier] : undefined

  if (_tag === 'Refinement' && ast.from) {
    const info = extractFromAST(ast.from, optional, nullable, seen)
    return format ? { ...info, format } : info
  }

  if (_tag === 'Transformation' && ast.from) {
    const info = extractFromAST(ast.from, optional, nullable, seen)
    return format ? { ...info, format } : info
  }

  if (_tag === 'Suspend') {
    return { type: 'recursive', optional, nullable }
  }

  if (_tag === 'Union' && ast.types) {
    return extractFromUnion(ast.types, optional, nullable, seen)
  }

  if (_tag === 'PropertySignatureDeclaration') {
    const innerOptional = ast.isOptional === true
    if (ast.type) {
      return extractFromAST(ast.type, innerOptional || optional, nullable, seen)
    }
  }

  if (_tag === 'TupleType') {
    return {
      type: 'array',
      item:
        ast.rest && ast.rest.length > 0
          ? extractFromAST(ast.rest[0].type, false, false, seen)
          : { type: null, optional: false, nullable: false },
      optional,
      nullable,
    }
  }

  if (_tag === 'TypeLiteral') {
    const fields: Record<string, SchemaInfo> = {}
    if (ast.propertySignatures) {
      for (const sig of ast.propertySignatures) {
        fields[String(sig.name)] = extractFromAST(
          sig.type,
          sig.isOptional,
          false,
          seen
        )
      }
    }
    return { type: 'object', fields, optional, nullable }
  }

  return { type: null, optional, nullable }
}

function extractFromUnion(
  types: EffectAST[],
  optional: boolean,
  nullable: boolean,
  seen: Set<unknown>
): SchemaInfo {
  let isOptional = optional
  let isNullable = nullable
  const remaining: EffectAST[] = []

  for (const member of types) {
    if (member._tag === 'UndefinedKeyword') {
      isOptional = true
    } else if (member._tag === 'Literal' && member.literal === null) {
      isNullable = true
    } else {
      remaining.push(member)
    }
  }

  const allStringLiterals =
    remaining.length > 0 &&
    remaining.every(
      (m) => m._tag === 'Literal' && typeof m.literal === 'string'
    )
  if (allStringLiterals) {
    return {
      type: 'enum',
      optional: isOptional,
      nullable: isNullable,
      enumValues: remaining.map((m) => m.literal as string),
    }
  }

  if (remaining.length === 1) {
    return extractFromAST(remaining[0], isOptional, isNullable, seen)
  }

  if (remaining.length === 0) {
    return { type: null, optional: isOptional, nullable: isNullable }
  }

  const optionInfos = remaining.map((m) =>
    extractFromAST(m, false, false, seen)
  )
  const collapsed = collapseUnionScalars(optionInfos)
  if (collapsed) {
    return { ...collapsed, optional: isOptional, nullable: isNullable }
  }
  const discriminator = detectEffectDiscriminator(remaining)
  return {
    type: 'union',
    options: optionInfos,
    ...(discriminator && { discriminator }),
    optional: isOptional,
    nullable: isNullable,
  }
}

function detectEffectDiscriminator(members: EffectAST[]): string | undefined {
  if (members.length < 2) return undefined
  if (!members.every((m) => m._tag === 'TypeLiteral' && m.propertySignatures)) {
    return undefined
  }
  const candidates = new Map<string, Set<string>>()
  const firstSignatures = members[0].propertySignatures ?? []
  for (const sig of firstSignatures) {
    const litValue = literalStringValue(sig.type)
    if (litValue === undefined) continue
    candidates.set(String(sig.name), new Set([litValue]))
  }
  for (let i = 1; i < members.length; i++) {
    const sigs = members[i].propertySignatures ?? []
    const seenKeys = new Set<string>()
    for (const sig of sigs) {
      const name = String(sig.name)
      if (!candidates.has(name)) continue
      const litValue = literalStringValue(sig.type)
      if (litValue === undefined) {
        candidates.delete(name)
        continue
      }
      const values = candidates.get(name)
      if (!values || values.has(litValue)) {
        candidates.delete(name)
        continue
      }
      values.add(litValue)
      seenKeys.add(name)
    }
    for (const key of Array.from(candidates.keys())) {
      if (!seenKeys.has(key)) candidates.delete(key)
    }
  }
  if (candidates.size === 0) return undefined
  if (candidates.has('_tag')) return '_tag'
  return candidates.keys().next().value
}

function literalStringValue(ast: EffectAST): string | undefined {
  if (ast._tag !== 'Literal') return undefined
  const lit = ast.literal
  return typeof lit === 'string' ? lit : undefined
}

/**
 * Extract {@link SchemaInfo} from an Effect Schema.
 *
 * Traverses the schema's AST tree. Primitives are keyword nodes,
 * optional/nullable are unions with `UndefinedKeyword`/`Literal(null)`,
 * and Date is detected via identifier annotations on Refinement,
 * Transformation, or Declaration nodes.
 *
 * @param schema - An Effect Schema instance
 * @returns Metadata describing the field's type, optionality, nullability,
 *   default value and enum values
 *
 * @example
 * ```ts
 * import { Schema } from 'effect'
 * fromEffect(Schema.NullOr(Schema.String))
 * // { type: 'string', optional: false, nullable: true }
 * ```
 */
function fromEffect(
  schema: unknown,
  seen: Set<unknown> = new Set()
): SchemaInfo {
  const effectSchema = asEffectSchema(schema)

  if (!effectSchema) {
    return { type: null, optional: false, nullable: false }
  }

  return extractFromAST(effectSchema.ast, false, false, seen)
}

function findTypeLiteral(ast: EffectAST): EffectAST | null {
  if (ast._tag === 'TypeLiteral') return ast
  if (ast._tag === 'Refinement' && ast.from) return findTypeLiteral(ast.from)
  if (ast._tag === 'Transformation' && ast.from)
    return findTypeLiteral(ast.from)
  return null
}

type EffectFieldInfo = {
  key: string
  ast: EffectAST
  optional: boolean
}

/**
 * Extract field info from an Effect Schema struct.
 *
 * Unwraps Refinement and Transformation AST nodes to find the
 * underlying TypeLiteral. Returns structured field info with
 * optionality from property signatures.
 *
 * @param schema - An Effect Schema that may be a struct
 * @returns An array of field info objects, or `null` if not a struct
 */
function extractEffectFields(schema: unknown): EffectFieldInfo[] | null {
  const effectSchema = asEffectSchema(schema)
  if (!effectSchema) return null

  const typeLiteral = findTypeLiteral(effectSchema.ast)
  if (!typeLiteral) return null

  const signatures = typeLiteral.propertySignatures
  if (!signatures || signatures.length === 0) return null

  return signatures.map((sig) => ({
    key: String(sig.name),
    ast: sig.type,
    optional: sig.isOptional === true,
  }))
}

export { isEffectSchema, fromEffect, extractEffectFields, extractFromAST }
