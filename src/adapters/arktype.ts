import type { FieldFormat, FieldType, SchemaInfo } from '../types'
import { fieldFormatValues } from '../types'

type ArkTypeNode = {
  kind: string
  inner: Record<string, unknown>
  meta?: Record<string, unknown>
  '~standard'?: { vendor?: string }
}

const arkFormatMap: Record<string, FieldFormat> = {
  uri: 'url',
}

function resolveArkFormat(
  meta?: Record<string, unknown>
): FieldFormat | undefined {
  const raw = meta?.format
  if (typeof raw !== 'string') return undefined
  if (raw in arkFormatMap) return arkFormatMap[raw]
  if (fieldFormatValues.has(raw)) return raw as FieldFormat
  return undefined
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
    let protoType: FieldType | null = null
    if (inner.proto === Date) protoType = 'date'
    else if (
      (typeof File !== 'undefined' && inner.proto === File) ||
      (typeof Blob !== 'undefined' && inner.proto === Blob)
    )
      protoType = 'file'
    return {
      type: protoType,
      optional: false,
      nullable: false,
    }
  }

  if (kind === 'union') {
    const format = resolveArkFormat(node.meta)
    const info = extractFromBranches((inner.branches as ArkTypeNode[]) ?? [])
    if (format) {
      return { ...info, format, type: info.type ?? 'string' }
    }
    return info
  }

  if (kind === 'intersection') {
    const format = resolveArkFormat(node.meta)
    if (inner.proto) {
      const protoNode = inner.proto as ArkTypeNode
      if (protoNode.inner.proto === Array) {
        const info: SchemaInfo = {
          type: 'array',
          ...(format && { format }),
          optional: false,
          nullable: false,
        }
        const structure = inner.structure as ArkTypeNode | undefined
        const seqNode = structure?.inner?.sequence as ArkTypeNode | undefined
        const variadicNode = seqNode?.inner?.variadic as ArkTypeNode | undefined
        if (variadicNode) {
          info.item = extractFromNode(variadicNode)
        }
        return info
      }
      return extractFromNode(protoNode)
    }
    if (inner.domain) {
      const domainNode = inner.domain as ArkTypeNode
      if ((domainNode.inner.domain as string) === 'object' && inner.structure) {
        const info: SchemaInfo = {
          type: 'object',
          ...(format && { format }),
          optional: false,
          nullable: false,
        }
        const structure = inner.structure as ArkTypeNode
        const required = (structure.inner.required ?? []) as ArkTypeNode[]
        const optionalProps = (structure.inner.optional ?? []) as ArkTypeNode[]
        if (required.length > 0 || optionalProps.length > 0) {
          info.fields = {}
          for (const prop of required) {
            info.fields[prop.inner.key as string] = extractFromNode(
              prop.inner.value as ArkTypeNode
            )
          }
          for (const prop of optionalProps) {
            const fieldInfo = extractFromNode(prop.inner.value as ArkTypeNode)
            info.fields[prop.inner.key as string] = {
              ...fieldInfo,
              optional: true,
            }
          }
        }
        return info
      }
      const info = extractFromNode(domainNode)
      return { ...info, ...(format && { format }) }
    }
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

function getArkTypeStructure(node: ArkTypeNode): ArkTypeNode | null {
  if (node.inner.structure) return node.inner.structure as ArkTypeNode
  if (node.kind === 'morph' && node.inner.in) {
    const input = node.inner.in as ArkTypeNode
    if (input.inner?.structure) return input.inner.structure as ArkTypeNode
  }
  return null
}

type ArkTypeFieldInfo = { key: string; value: ArkTypeNode; optional: boolean }

/**
 * Extract field info from an ArkType object schema.
 *
 * Handles morph (pipe) wrappers by unwrapping via `inner.in`.
 * Returns structured field info with optionality flag since ArkType
 * stores optional status on the property node, not the value.
 *
 * @param schema - An ArkType type that may be an object type
 * @returns An array of field info objects, or `null` if not an object type
 */
function extractArkTypeFields(schema: unknown): ArkTypeFieldInfo[] | null {
  const node = asArkTypeSchema(schema)
  if (!node) return null

  const structure = getArkTypeStructure(node)
  if (!structure) return null

  const fields: ArkTypeFieldInfo[] = []
  const required = (structure.inner.required ?? []) as ArkTypeNode[]
  const optional = (structure.inner.optional ?? []) as ArkTypeNode[]

  for (const prop of required) {
    fields.push({
      key: prop.inner.key as string,
      value: prop.inner.value as ArkTypeNode,
      optional: false,
    })
  }

  for (const prop of optional) {
    fields.push({
      key: prop.inner.key as string,
      value: prop.inner.value as ArkTypeNode,
      optional: true,
    })
  }

  return fields
}

export { isArkTypeSchema, fromArkType, extractArkTypeFields, extractFromNode }
