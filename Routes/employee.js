// routes/employees.js

const express = require("express");
const router = express.Router();
const knex = require("../db/db");
const bcrypt = require("bcrypt");
const { verifyToken } = require("../middleware/auth");
const { sendEmployeeWelcomeMail } = require("../utils/sendMail");

// router.post("/create", verifyToken, async (req, res) => {
//     try {
//         const {
//             full_name,
//             email,
//             role,
//             department,
//             designation,
//             gender,
//             whatsapp,
//             password // optional
//         } = req.body;

//         // Determine company_id from authenticated admin
//         const adminId = req.user && req.user.id;
//         if (!adminId) {
//             return res.status(401).json({ success: false, message: "Unauthorized" });
//         }

//         const admin = await knex('admins').where({ id: adminId }).first();
//         if (!admin) {
//             return res.status(403).json({ success: false, message: "Admin not found" });
//         }

//         const company_id = admin.company_id;

//         // If password not provided, use default
//         const finalPassword = password ? password : process.env.PASSWORD || "defaultPassword123";

//         // Hash password
//         const hashedPassword = await bcrypt.hash(finalPassword, 10);

//         const newEmployee = {
//             company_id,
//             full_name,
//             email,
//             password: hashedPassword,
//             role,
//             department,
//             designation,
//             gender,
//             whatsapp,
//             created_at: new Date(),
//             updated_at: new Date()
//         };

//         const inserted = await knex("employees").insert(newEmployee);

//         res.status(201).json({
//             success: true,
//             message: "Employee created successfully",
//             employee_id: inserted[0]
//         });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({
//             success: false,
//             message: "Error creating employee",
//             error: err.message
//         });
//     }
// });

router.post("/create", verifyToken, async (req, res) => {
  try {
    const {
      full_name,
      email,
      role,
      department,
      designation,
      gender,
      whatsapp,
      password // optional
    } = req.body;

    // 1️⃣ Get admin id from token
    const adminId = req.user && req.user.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 2️⃣ Get admin
    const admin = await knex("admins").where({ id: adminId }).first();
    if (!admin) return res.status(403).json({ success: false, message: "Admin not found" });

    // 3️⃣ Get company
    const company = await knex("companies").where({ id: admin.company_id }).first();
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    const company_id = admin.company_id;

    // 4️⃣ Check duplicate email in same company
    const existingEmployee = await knex("employees").where({ email, company_id }).first();
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: "Employee with this email already exists in your company" });
    }

    // 5️⃣ Password handling
    const tempPassword = password || process.env.PASSWORD || "welcome@123";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 6️⃣ Insert employee
    const [employee_id] = await knex("employees").insert({
      company_id,
      full_name,
      email,
      password: hashedPassword,
      role,
      department,
      designation,
      gender,
      whatsapp,
      created_at: new Date(),
      updated_at: new Date()
    });

    // 7️⃣ Send welcome mail
    await sendEmployeeWelcomeMail({
      to: email,
      companyName: company.companyName, // ✅ correct column
      fullName: full_name,
      email,
      password: tempPassword
    });

    // 8️⃣ Response
    res.status(201).json({
      success: true,
      message: "Employee created & welcome mail sent successfully",
      employee_id
    });

  } catch (err) {
    console.error("Employee Create Error:", err);
    res.status(500).json({ success: false, message: "Error creating employee", error: err.message });
  }
});


router.get("/", async (req, res) => {
    try {
        const employees = await knex("employees").select("*"); 
         employees.forEach(emp => delete emp.password);

        res.status(200).json({
            success: true,
            data: employees
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error fetching employees",
            error: err.message
        });
    }
});

router.put("/update/:id", async (req, res) => {
    try {
        const employeeId = req.params.id;

        const {
            company_id,
            full_name,
            email,
            role,
            department,
            designation,
            gender,
            whatsapp,
            password // optional
        } = req.body;

        // build update object
        const updateData = {
            company_id,
            full_name,
            email,
            role,
            department,
            designation,
            gender,
            whatsapp,
            updated_at: new Date()
        };

        // if password provided, hash it
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // update employee
        const updated = await knex("employees")
            .where({ id: employeeId })
            .update(updateData);

        if (updated === 0) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Employee updated successfully"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error updating employee",
            error: err.message
        });
    }
});

router.delete("/delete/:id", async (req, res) => {
    try {
        const employeeId = req.params.id;

        const deleted = await knex("employees")
            .where({ id: employeeId })
            .del();

        if (deleted === 0) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Employee deleted successfully"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error deleting employee",
            error: err.message
        });
    }
});


module.exports = router;
