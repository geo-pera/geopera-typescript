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
