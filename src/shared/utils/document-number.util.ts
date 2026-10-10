import type { Knex } from "knex";

export const DocumentSequences = {
  RECEIVABLE_INVOICE: "INV",
  EXPENSE_BILL: "EXP",
  ASSET: "AST",
} as const;

export type DocumentSequence =
  (typeof DocumentSequences)[keyof typeof DocumentSequences];

/**
 * Next gap-free document number for the year, e.g. "INV-2026-0007".
 * Must run inside the transaction that creates the document: the sequence
 * row stays locked until commit, so concurrent creators get distinct numbers
 * and a rolled-back document gives its number back.
 */
export async function nextDocumentNumber(
  trx: Knex.Transaction,
  prefix: DocumentSequence,
  year: number
): Promise<string> {
  await trx.raw(
    // `last_value` is a reserved word in MySQL 8, so it must be quoted in raw SQL.
    "INSERT IGNORE INTO document_sequences (`name`, `year`, `last_value`) VALUES (?, ?, 0)",
    [prefix, year]
  );
  const row = (await trx("document_sequences")
    .where({ name: prefix, year })
    .forUpdate()
    .first("last_value")) as { last_value: number };

  const next = Number(row.last_value) + 1;
  await trx("document_sequences")
    .where({ name: prefix, year })
    .update({ last_value: next });

  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}
