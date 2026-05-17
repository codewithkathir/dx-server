import type { Knex } from "knex";

const SAMPLE_CATEGORY_NAME = "General Services";

export async function seed(knex: Knex): Promise<void> {
  const existing = await knex("categories")
    .where({ name: SAMPLE_CATEGORY_NAME })
    .whereNull("deleted_at")
    .first();

  if (existing) {
    return;
  }

  const [categoryId] = await knex("categories").insert({
    name: SAMPLE_CATEGORY_NAME,
    description: "Default main category for catalog hierarchy",
    status: "active",
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });

  const [subCategoryId] = await knex("sub_categories").insert({
    category_id: categoryId,
    name: "Consulting",
    description: "Consulting sub category",
    status: "active",
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });

  await knex("sub_sub_categories").insert({
    category_id: categoryId,
    sub_category_id: subCategoryId,
    name: "Strategy",
    description: "Strategy sub sub category",
    status: "active",
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });

  await knex("sub_categories").insert([
    {
      category_id: categoryId,
      name: "Operations",
      description: "Operations sub category",
      status: "active",
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);

  await knex("categories").insert({
    name: "Products",
    description: "Product catalog category",
    status: "active",
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });

  await knex("payment_methods").insert([
    {
      name: "Cash",
      code: "CASH",
      description: "Cash payment",
      status: "active",
      sort_order: 1,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      name: "Bank Transfer",
      code: "BANK_TRANSFER",
      description: "Direct bank transfer",
      status: "active",
      sort_order: 2,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      name: "Credit Card",
      code: "CREDIT_CARD",
      description: "Card payments",
      status: "active",
      sort_order: 3,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      name: "Cheque",
      code: "CHEQUE",
      description: "Cheque payment (inactive sample)",
      status: "inactive",
      sort_order: 4,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);
}
