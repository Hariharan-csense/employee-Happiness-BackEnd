exports.up = async function (knex) {
  await knex.schema.createTable("employees", (table) => {
    table.increments("id").primary();

    // 🔐 Multi-tenant support
    table
      .integer("company_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("companies")
      .onDelete("CASCADE"); // If company deleted → cascade employees

    table.string("full_name").notNullable();
    table.string("email").notNullable().unique();
    table.string("password").notNullable();

    table.string("role").notNullable().defaultTo("employee"); // employee/admin
    table.string("department").nullable();
    table.string("designation").nullable();
    table.enum("gender", ["male", "female", "other"]).nullable();

    table.string("whatsapp").nullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // 🔹 Indexes for performance
    table.index(["company_id"]);
    table.index(["department"]);
    table.index(["designation"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("employees");
};
