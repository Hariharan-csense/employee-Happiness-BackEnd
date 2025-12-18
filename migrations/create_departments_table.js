exports.up = async function (knex) {
  await knex.schema.createTable("departments", (table) => {
    table.increments("id").primary();

    // 🔐 Company isolation
    table
      .integer("company_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("companies")
      .onDelete("CASCADE"); // If company deleted → cascade delete departments

    table.string("departmentName").notNullable();
    table.text("description").nullable();

    table.timestamp("createdAt").defaultTo(knex.fn.now());
    table.timestamp("updatedAt").defaultTo(knex.fn.now());

    // 🔹 Indexes
    table.index(["company_id"]);
    table.unique(["company_id", "departmentName"]); // Prevent duplicate department names per company
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("departments");
};
