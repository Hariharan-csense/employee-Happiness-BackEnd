exports.up = async function (knex) {
  await knex.schema.createTable("surveysession", function (table) {
    table.increments("id").primary();

    // 🔐 Company isolation
    table
      .integer("company_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("companies")
      .onDelete("CASCADE");

    table.string("title").notNullable();
    table.text("message").nullable();

    table.enum("recipientType", [
      "all",
      "employee",
      "department",
      "designation"
    ]).defaultTo("all");

    // Store recipient selections as JSON
    table.json("selectedEmployee").nullable();
    table.json("selectedDepartment").nullable();
    table.json("selectedDesignation").nullable();

    table.integer("totalSent").defaultTo(0);

    table.boolean("allowAnonymous").defaultTo(false);

    table.string("category").defaultTo("general");

    table.timestamp("sentAt").nullable();

    table.timestamp("createdAt").defaultTo(knex.fn.now());
    table.timestamp("updatedAt").defaultTo(knex.fn.now());

    // 🔍 Performance
    table.index(["company_id"]);
    table.index(["sentAt"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("surveysession");
};
