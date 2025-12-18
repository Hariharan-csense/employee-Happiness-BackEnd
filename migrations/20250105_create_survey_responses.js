exports.up = async function (knex) {
  await knex.schema.createTable("surveyresponses", (table) => {
    table.increments("id").primary();

    // 🔗 Link to survey session
    table
      .integer("surveyId")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("surveysession")
      .onDelete("CASCADE");

    // 🔹 Employee info (nullable for anonymous)
    table.integer("employeeId").unsigned().nullable()
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");

    table.string("employeeName").nullable();
    table.string("department").nullable();

    table.integer("score").notNullable(); // 1-10 validated in app
    table.text("comments").nullable();

    table.boolean("isAnonymous").defaultTo(false);

    // Timestamp
    table.timestamp("createdAt").defaultTo(knex.fn.now());
    table.timestamp("updatedAt").defaultTo(knex.fn.now());

    // 🔹 Indexes for performance
    table.index(["surveyId"]);
    table.index(["employeeId"]);
    table.index(["isAnonymous"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("surveyresponses");
};
