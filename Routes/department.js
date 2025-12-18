const express = require('express');
const router = express.Router();
const knex = require('../db/db');
const { verifyToken } = require('../middleware/auth');
// Create a new department

router.post("/create", verifyToken, async (req, res) => {
  try {
    const { departmentName, description } = req.body;

    // 🔐 Admin only
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // 🔐 Get admin id & company_id directly from token
    const adminId = req.user.id;
    const companyId = req.user.company_id;

    if (!adminId || !companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized or company not linked"
      });
    }

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: "Department name is required"
      });
    }

    // 🔥 Insert department with company isolation
    const newDepartment = {
      company_id: companyId,   // ✅ FIXED
      departmentName,
      description: description || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [id] = await knex("departments").insert(newDepartment);

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      department_id: id
    });

  } catch (error) {
    console.error("Error creating department:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating department"
    });
  }
});


// Get all departments for a company

router.get('/', verifyToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Company ID missing in token' });
    }

    const departments = await knex('departments')
      .where('company_id', companyId)
      .select('*');

    res.status(200).json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});


router.put('/update/:id', async (req, res) => {
    try {
        const departmentId = req.params.id;
        const { departmentName, description } = req.body;
        const updatedDepartment = {
            departmentName,
            description,
            updatedAt: new Date()
        };
        await knex('departments').where({ id: departmentId }).update(updatedDepartment);
        res.status(200).json({ message: 'Department updated successfully' });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: 'Failed to update department' });
    }
});

router.delete('/delete/:id', async (req, res) => {
    try {
        const departmentId = req.params.id;
        await knex('departments').where({ id: departmentId }).del();
        res.status(200).json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

module.exports = router;