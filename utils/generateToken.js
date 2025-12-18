const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    id: employee.id,
    email: employee.email,
    name: employee.full_name,
    department: employee.department,
    role: "employee",
    company_id: employee.company_id   // 🔥 MUST INCLUDE
  },
  JWT_SECRET,
  { expiresIn: "7d" }
);

module.exports = token;
