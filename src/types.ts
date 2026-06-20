import type { operations } from "./api";

export type { operations };

/** Every operation_id the Geopera API exposes, e.g. `"orders.archive.place"`. */
export type OperationId = keyof operations;

/** The typed request body (input_model) for an operation. */
export type OperationInput<K extends OperationId> = operations[K] extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : Record<string, never>;

/**
 * The typed success output (output model) for an operation. Operations
 * answer 200/201/202 depending on the op (money routes are 201/202), so we
 * resolve whichever 2xx the operation declares.
 */
export type OperationOutput<K extends OperationId> = operations[K] extends {
  responses: infer R;
}
  ? R extends { 200: { content: { "application/json": infer O } } }
    ? O
    : R extends { 201: { content: { "application/json": infer O } } }
      ? O
      : R extends { 202: { content: { "application/json": infer O } } }
        ? O
        : unknown
  : unknown;

/** Per-call options for a namespaced operation method (mirrors `invoke`). */
export interface InvokeOptions {
  signal?: AbortSignal;
}

/**
 * A namespaced operation method. The body is required unless the operation's
 * input model is fully optional, in which case it may be omitted.
 */
export type OperationMethod<K extends OperationId> =
  Record<string, never> extends OperationInput<K>
    ? (body?: OperationInput<K>, options?: InvokeOptions) => Promise<OperationOutput<K>>
    : (body: OperationInput<K>, options?: InvokeOptions) => Promise<OperationOutput<K>>;

// --- internal helpers for the namespace tree -------------------------------
type _Head<S extends string> = S extends `${infer H}.${string}` ? H : S;
type _Rest<S extends string, H extends string> = S extends `${H}.${infer R}` ? R : never;

/**
 * Builds a nested object type from the (relative) operation ids under `Prefix`.
 * Each dotted `operation_id` becomes a path of properties ending in a typed
 * {@link OperationMethod} — e.g. `"orders.archive.place"` becomes
 * `orders.archive.place(body)`. Derived entirely from {@link OperationId}, so it
 * tracks the API with zero hand-maintenance.
 */
export type NamespaceTree<Rel extends string, Prefix extends string> = {
  [H in _Head<Rel>]: `${Prefix}${H}` extends OperationId
    ? OperationMethod<`${Prefix}${H}` & OperationId>
    : NamespaceTree<_Rest<Extract<Rel, `${H}.${string}`>, H>, `${Prefix}${H}.`>;
};

/** The full `client.<resource>.<action>(body)` surface, derived from `OperationId`. */
export type Namespaces = NamespaceTree<OperationId & string, "">;
