import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  const employee = await knex("employees")
    .where({ email: "john.doe@example.com" })
    .whereNull("deleted_at")
    .first();

  if (!employee) {
    return;
  }

  const existing = await knex("expenses")
    .where({ employee_id: employee.id })
    .whereNull("deleted_at")
    .first();

  if (existing) {
    return;
  }

  const whom = await knex("employees")
    .where({ email: "jane.smith@example.com" })
    .whereNull("deleted_at")
    .first();

  const category = await knex("categories")
    .where({ name: "General Services" })
    .whereNull("deleted_at")
    .first();

  const subCategory = category
    ? await knex("sub_categories")
        .where({ category_id: category.id, name: "Consulting" })
        .whereNull("deleted_at")
        .first()
    : undefined;

  const subSubCategory =
    category && subCategory
      ? await knex("sub_sub_categories")
          .where({
            category_id: category.id,
            sub_category_id: subCategory.id,
            name: "Strategy",
          })
          .whereNull("deleted_at")
          .first()
      : undefined;

  const paymentMethod = await knex("payment_methods")
    .where({ code: "CASH" })
    .whereNull("deleted_at")
    .first();

  if (!whom || !category || !subCategory || !paymentMethod) {
    return;
  }

  await knex("expenses").insert({
    employee_id: employee.id,
    date: "2026-05-01",
    amount: 250.5,
    whom: whom.id,
    category_id: category.id,
    sub_category_id: subCategory.id,
    sub_sub_category_id: subSubCategory?.id ?? null,
    description: "Sample expense – seed data",
    payment_method_id: paymentMethod.id,
    support_file: null,
    employee_status: "pending",
    admin_status: "pending",
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });

  await knex("employees")
    .whereIn("email", [
      "john.doe@example.com",
      "jane.smith@example.com",
      "ahmed.hassan@example.com",
    ])
    .whereNull("employee_code")
    .update({
      employee_code: knex.raw(
        "CASE email WHEN 'john.doe@example.com' THEN 'EMP001' WHEN 'jane.smith@example.com' THEN 'EMP002' WHEN 'ahmed.hassan@example.com' THEN 'EMP003' END"
      ),
    });
}
