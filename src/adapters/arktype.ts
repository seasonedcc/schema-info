import type { FieldType, SchemaInfo } from '../types'

type ArkTypeNode = {
  kind: string
  inner: Record<string, unknown>
  '~standard'?: { vendor?: string }
}

function asArkTypeSchema(schema: unknown): ArkTypeNode | null {
  const candidate = schema as Partial<ArkTypeNode>
  if (
    typeof candidate?.kind !== 'string' ||
    typeof candidate?.inner !== 'object'
  ) {
    return null
  }

  const vendor = candidate['~standard']?.vendor
  if (vendor !== 'arktype') return null

  return candidate as ArkTypeNode
}

/**
 * Detect whether the given value is an ArkType type.
 *
 * @param schema - Any value to check
 * @returns `true` when the value is an ArkType type instance
 *
 * @example
 * ```ts
 * import { type } from 'arktype'
 * isArkTypeSchema(type('string')) // true
 * isArkTypeSchema('hello')        // false
 * ```
 */
function isArkTypeSchema(schema: unknown): boolean {
  return asArkTypeSchema(schema) !== null
}

const domainMap: Record<string, FieldType> = {
  string: 'string',
  number: 'number',
}

function isBooleanUnion(branches: ArkTypeNode[]) {
  if (branches.length !== 2) return false
  const units = branches
    .filter((b) => b.kind === 'unit')
    .map((b) => b.inner.unit)
  return units.includes(true) && units.includes(false)
}

function extractFromBranches(branches: ArkTypeNode[]): SchemaInfo {
  let optional = false
  let nullable = false
  const remaining: ArkTypeNode[] = []

  for (const branch of branches) {
    if (branch.kind === 'unit' && branch.inner.unit === undefined) {
      optional = true
    } else if (branch.kind === 'unit' && branch.inner.unit === null) {
      nullable = true
    } else {
      remaining.push(branch)
    }
  }

  if (isBooleanUnion(remaining)) {
    return { type: 'boolean', optional, nullable }
  }

  const allStringUnits =
    remaining.length > 0 &&
    remaining.every(
      (b) => b.kind === 'unit' && typeof b.inner.unit === 'string'
    )
  if (allStringUnits) {
    return {
      type: 'enum',
      optional,
      nullable,
      enumValues: remaining.map((b) => b.inner.unit as string),
    }
  }

  if (remaining.length === 1) {
    const info = extractFromNode(remaining[0])
    return { ...info, optional, nullable }
  }

  return { type: null, optional, nullable }
}

function extractFromNode(node: ArkTypeNode): SchemaInfo {
  const { kind, inner } = node

  if (kind === 'domain') {
    return {
      type: domainMap[inner.domain as string] ?? null,
      optional: false,
      nullable: false,
    }
  }

  if (kind === 'unit' && typeof inner.unit === 'string') {
    return {
      type: 'enum',
      optional: false,
      nullable: false,
      enumValues: [inner.unit as string],
    }
  }

  if (kind === 'proto') {
    return {
      type: inner.proto === Date ? 'date' : null,
      optional: false,
      nullable: false,
    }
  }

  if (kind === 'union') {
    return extractFromBranches((inner.branches as ArkTypeNode[]) ?? [])
  }

  if (kind === 'intersection') {
    if (inner.domain) return extractFromNode(inner.domain as ArkTypeNode)
    if (inner.proto) return extractFromNode(inner.proto as ArkTypeNode)
    return { type: null, optional: false, nullable: false }
  }

  return { type: null, optional: false, nullable: false }
}

/**
 * Extract {@link SchemaInfo} from an ArkType type.
 *
 * ArkType represents types as a node tree. Primitives are domain or
 * proto nodes, while optional/nullable are unions with `undefined`/`null`
 * unit branches. Boolean is a union of `unit(false) + unit(true)`.
 * Enums are unions of string unit nodes.
 *
 * @param schema - An ArkType type instance
 * @returns Metadata describing the field's type, optionality, nullability,
 *   default value and enum values
 *
 * @example
 * ```ts
 * import { type } from 'arktype'
 * fromArkType(type('string | null'))
 * // { type: 'string', optional: false, nullable: true }
 * ```
 */
function fromArkType(schema: unknown): SchemaInfo {
  const node = asArkTypeSchema(schema)

  if (!node) {
    return { type: null, optional: false, nullable: false }
  }

  return extractFromNode(node)
}

export { isArkTypeSchema, fromArkType }
