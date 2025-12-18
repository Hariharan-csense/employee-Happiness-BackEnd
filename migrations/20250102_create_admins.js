exports.up = function (knex) {
  return knex.schema.createTable("admins", function (table) {
    table.increments("id").primary();
    table.integer("company_id").unsigned().nullable().references("id").inTable("companies").onDelete("SET NULL");

    table.string("full_name").notNullable();
    table.string("email").notNullable().unique();
    table.string("password").notNullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("admins");
};
