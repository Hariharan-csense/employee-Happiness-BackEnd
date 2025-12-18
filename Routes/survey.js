const express = require("express");
const router = express.Router();
const knex = require("../db/db"); 
const { verifyToken } = require("../middleware/auth");
// POST route → Save SurveySession + Responses
const { sendSurveyMail } = require("../utils/sendSurveyMail");


// router.post("/create", verifyToken, async (req, res) => {
//   const {
//     title,
//     message,
//     recipientType = "all",
//     selectedEmployee,
//     selectedDepartment,
//     selectedDesignation,
//     allowAnonymous = false,
//     category = "general"
//   } = req.body;

//   const empList = Array.isArray(selectedEmployee) ? selectedEmployee : [];
//   const deptList = Array.isArray(selectedDepartment) ? selectedDepartment : [];
//   const desigList = Array.isArray(selectedDesignation) ? selectedDesignation : [];

//   const sentAt = new Date();
//   const { company_id } = req.user; // 🔥 Admin's company_id

//   try {
//     // 1️⃣ Build recipients query (company-specific)
//     let query = knex("employees")
//       .select("id", "full_name", "department", "designation")
//       .where("company_id", company_id); // 🔥 COMPANY FILTER

//     if (recipientType === "employee" && empList.length > 0) {
//       query.whereIn("id", empList);
//     } else if (recipientType === "department" && deptList.length > 0) {
//       query.whereIn("department", deptList);
//     } else if (recipientType === "designation" && desigList.length > 0) {
//       query.whereIn("designation", desigList);
//     }

//     const recipients = await query;

//     // 2️⃣ Insert survey session with correct totalSent
//     const [surveyId] = await knex("surveysession").insert({
//       title,
//       message,
//       sentAt,
//       createdAt: new Date(),
//       recipientType,
//       selectedEmployee: empList.length ? JSON.stringify(empList) : null,
//       selectedDepartment: deptList.length ? JSON.stringify(deptList) : null,
//       selectedDesignation: desigList.length ? JSON.stringify(desigList) : null,
//       totalSent: recipients.length,
//       allowAnonymous: allowAnonymous ? 1 : 0,
//       category,
//       company_id // 🔥 LINK SURVEY TO COMPANY
//     });

//     // 3️⃣ Success response
//     return res.status(201).json({
//       message: "Survey created successfully!",
//       surveyId,
//       totalSent: recipients.length,
//       allowAnonymous: !!allowAnonymous
//     });

//   } catch (error) {
//     console.error("Error creating survey:", error);

//     if (error.code === "ER_DUP_ENTRY") {
//       return res.status(400).json({
//         error: "Survey already exists or duplicate entry"
//       });
//     }

//     return res.status(500).json({
//       error: "Failed to create survey",
//       details: process.env.NODE_ENV === "development"
//         ? error.message
//         : undefined
//     });
//   }
// });
router.post("/create", verifyToken, async (req, res) => {
  const {
    title,
    message,
    recipientType = "all",
    selectedEmployee,
    selectedDepartment,
    selectedDesignation,
    allowAnonymous = false,
    category = "general"
  } = req.body;

  const empList = Array.isArray(selectedEmployee) ? selectedEmployee : [];
  const deptList = Array.isArray(selectedDepartment) ? selectedDepartment : [];
  const desigList = Array.isArray(selectedDesignation) ? selectedDesignation : [];

  const sentAt = new Date();
  const { company_id } = req.user; // Admin's company_id

  try {
    // 1️⃣ Build recipients query
    let query = knex("employees")
      .select("id", "full_name", "email", "department", "designation")
      .where("company_id", company_id);

    if (recipientType === "employee" && empList.length > 0) {
      query.whereIn("id", empList);
    } else if (recipientType === "department" && deptList.length > 0) {
      query.whereIn("department", deptList);
    } else if (recipientType === "designation" && desigList.length > 0) {
      query.whereIn("designation", desigList);
    }

    const recipients = await query;

    if (recipients.length === 0) {
      return res.status(400).json({
        error: "No recipients found for the selected criteria."
      });
    }

    // 2️⃣ Insert survey session with status = "pending" by default
    const [surveyId] = await knex("surveysession").insert({
      title,
      message,
      sentAt,
      createdAt: new Date(),
      recipientType,
      selectedEmployee: empList.length ? JSON.stringify(empList) : null,
      selectedDepartment: deptList.length ? JSON.stringify(deptList) : null,
      selectedDesignation: desigList.length ? JSON.stringify(desigList) : null,
      totalSent: recipients.length,
      allowAnonymous: allowAnonymous ? 1 : 0,
      category,
      company_id,
      status: "pending" // 🔥 NEW: Default status
    });

    // 3️⃣ Send emails in parallel
    await Promise.all(
      recipients.map(emp =>
        sendSurveyMail({
          to: emp.email,
          fullName: emp.full_name,
          title,
          message,
          surveyId,
          allowAnonymous
        })
      )
    );

    // Optional: Update status to "sent" after emails are dispatched
    // You can decide if you want this behavior
    await knex("surveysession")
      .where("id", surveyId)
      .update({ status: "sent" });

    // 4️⃣ Return success response
    return res.status(201).json({
      message: "Survey created and emails sent successfully!",
      surveyId,
      totalSent: recipients.length,
      allowAnonymous: !!allowAnonymous,
      status: "sent" // Reflect final status
    });

  } catch (error) {
    console.error("Error creating survey:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "Duplicate entry – survey may already exist."
      });
    }

    return res.status(500).json({
      error: "Failed to create survey",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// router.post("/survey/respond", verifyToken, async (req, res) => {
//   const { surveyId, score, comments, isAnonymous } = req.body;

//   try {
//     //   
//     if (!surveyId || score === undefined || score === null) {
//       return res.status(400).json({ error: "surveyId and score are required" });
//     }
//     if (score < 1 || score > 10) {
//       return res.status(400).json({ error: "Score must be between 1 and 10" });
//     }

//     const anonymous = isAnonymous === true || isAnonymous === "true";
//     const employeeId = anonymous ? null : req.user.id;

//     let employeeName = anonymous ? "Anonymous" : null;
//     let department = anonymous ? null : null;

//     // Fetch employee details only if not anonymous
//     if (!anonymous) {
//       try {
//         const employee = await knex("employees")
//           .where({ id: employeeId })
//           .select("full_name as name", "department")
//           .first();

//         if (!employee) {
//           return res.status(404).json({ error: "Employee not found" });
//         }

//         employeeName = employee.name;
//         department = employee.department;
//       } catch (dbError) {
//         console.error("Error fetching employee:", dbError);
//         return res.status(500).json({ error: "Failed to fetch employee details" });
//       }
//     }

//     const responseData = {
//       surveyId: Number(surveyId), // Ensure it's a number
//       score: Number(score),
//       comments: comments?.trim() || null,
//       createdAt: new Date(),
//       isAnonymous: anonymous,
//       employeeId,
//       employeeName,
//       department,
//     };

//     // Critical Fix #1: Use correct table name (lowercase!)
//     const tableName = "surveyresponses"; // ← THIS IS KEY

//     // Check for existing response (same survey + same user)
//     const existing = await knex(tableName)
//       .where({
//         surveyId: responseData.surveyId,
//         employeeId: responseData.employeeId,
//       })
//       .first();

//     if (existing) {
//       await knex(tableName)
//         .where({ id: existing.id })
//         .update(responseData);
//     } else {
//       await knex(tableName).insert(responseData);
//     }

//     return res.json({
//       message: anonymous
//         ? "Thank you! Your anonymous feedback was recorded."
//         : "Thank you! Your response has been saved.",
//       status: "success",
//     });
//   } catch (error) {
//     console.error("Survey save error:", error);

//     // Better error handling for foreign key
//     if (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452) {
//       return res.status(400).json({
//         error: "Invalid survey session. It may have ended or doesn't exist.",
//       });
//     }

//     if (error.code === "ER_NO_SUCH_TABLE") {
//       return res.status(500).json({
//         error: "Database table missing. Contact admin.",
//       });
//     }

//     res.status(500).json({ error: "Failed to save survey response" });
//   }
// });

router.post("/survey/respond", verifyToken, async (req, res) => {
  const { surveyId, score, comments, isAnonymous } = req.body;

  try {
    if (!surveyId || score === undefined || score === null) {
      return res.status(400).json({ error: "surveyId and score are required" });
    }
    if (score < 1 || score > 10) {
      return res.status(400).json({ error: "Score must be between 1 and 10" });
    }

    const anonymous = isAnonymous === true || isAnonymous === "true";
    const employeeId = req.user.id; // 🔥 ALWAYS store actual employeeId

    let employeeName = null;
    let department = null;

    // Only fetch name/department if NOT anonymous (for display in admin reports)
    if (!anonymous) {
      const employee = await knex("employees")
        .where({ id: employeeId })
        .select("full_name as name", "department")
        .first();

      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      employeeName = employee.name;
      department = employee.department;
    }
    // If anonymous → employeeName & department = null (hidden in reports)

    const responseData = {
      surveyId: Number(surveyId),
      score: Number(score),
      comments: comments?.trim() || null,
      createdAt: new Date(),
      
      isAnonymous: anonymous ? 1 : 0,  // 1 = anonymous
      employeeId: employeeId,         // 🔥 ALWAYS store real ID
      employeeName,                   // null if anonymous
      department,                     // null if anonymous
    };

    const existing = await knex("surveyresponses")
      .where({
        surveyId: responseData.surveyId,
        employeeId: responseData.employeeId,
      })
      .first();

    let isNewResponse = !existing;

    if (existing) {
      await knex("surveyresponses")
        .where({ id: existing.id })
        .update(responseData);
    } else {
      await knex("surveyresponses").insert(responseData);
    }

    // Update survey status to "responded" on first response
    if (isNewResponse) {
      await knex("surveysession")
        .where({ id: surveyId })
        .whereNot("status", "responded")
        .update({ status: "responded" });
    }

    return res.json({
      message: anonymous
        ? "Thank you! Your anonymous feedback was recorded."
        : existing
        ? "Your response has been updated!"
        : "Thank you! Your response has been saved.",
      status: "success",
    });

  } catch (error) {
    console.error("Survey save error:", error);
    res.status(500).json({ error: "Failed to save survey response" });
  }
});

router.put("/survey/respond/:surveyId", verifyToken, async (req, res) => {
  const { surveyId } = req.params;
  const { score, comments, isAnonymous } = req.body;

  const { id: employeeId, role, company_id } = req.user;

  // Employee only
  if (role !== "employee") {
    return res.status(403).json({ error: "Only employees can respond to surveys" });
  }

  if (!employeeId || !company_id) {
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }

  try {
    // Validate score
    if (score === undefined || score === null) {
      return res.status(400).json({ error: "Score is required" });
    }

    if (score < 1 || score > 10) {
      return res.status(400).json({ error: "Score must be between 1 and 10" });
    }

    const responseData = {
      score,
      comments: comments?.trim() || null,
      isAnonymous: !!isAnonymous
    };

    // 🔥 COMPANY-SAFE UPDATE
    const updatedCount = await knex("SurveyResponses as sr")
      .join("employees as e", "sr.employeeId", "e.id")
      .where("sr.surveyId", parseInt(surveyId))
      .andWhere("sr.employeeId", employeeId)
      .andWhere("e.company_id", company_id) // 🔐 COMPANY CHECK
      .update(responseData);

    if (updatedCount === 0) {
      return res.status(404).json({
        error: "Survey response not found or access denied"
      });
    }

    res.status(200).json({
      message: "Survey response updated successfully!",
      status: "success"
    });

  } catch (error) {
    console.error("Error while updating response:", error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
});




router.get("/notifications", verifyToken, async (req, res) => {
  try {
    const { id: employeeId, role, company_id } = req.user;

    if (role !== "employee") {
      return res.status(403).json({ error: "Only employees can view notifications" });
    }

    // Fetch surveys assigned to this employee, not yet responded, company-specific
    const notifications = await knex("SurveyResponses as sr")
      .join("SurveySession as ss", "sr.surveyId", "ss.id")
      .join("employees as e", "sr.employeeId", "e.id") // ensure company alignment
      .where("sr.employeeId", employeeId)
      .andWhere("e.company_id", company_id) // 🔥 COMPANY FILTER
      .whereNull("sr.score")
      .select(
        "ss.id as surveyId",
        "ss.title",
        "ss.message",
        "ss.category",
        "ss.sentAt",
        "ss.allowAnonymous"
      )
      .orderBy("ss.sentAt", "desc");

    res.status(200).json({ notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



router.get("/responses", verifyToken, async (req, res) => {
  try {
    // Admin only
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied, admin only" });
    }

    const { company_id } = req.user;

    if (!company_id) {
      return res.status(400).json({ error: "Company ID missing in token" });
    }

    const responses = await knex("surveyresponses as sr")
      // 🔥 Join survey session to filter by company
      .join("surveysession as ss", "sr.surveyId", "ss.id")

      // 🔥 LEFT JOIN employees (anonymous-safe)
      .leftJoin("employees as e", "sr.employeeId", "e.id")

      // 🔐 Company isolation
      .where("ss.company_id", company_id)

      .select(
        "sr.id",
        "sr.surveyId",
        "ss.title as surveyTitle",
        "sr.employeeId",
        knex.raw(`
          CASE 
            WHEN sr.isAnonymous = 1 THEN 'Anonymous'
            ELSE sr.employeeName
          END as employeeName
        `),
        "sr.department",
        "sr.score",
        "sr.comments",
        "sr.isAnonymous",
        "sr.createdAt"
      )
      .orderBy("sr.createdAt", "desc");

    res.status(200).json({
      totalResponses: responses.length,
      responses
    });

  } catch (error) {
    console.error("Error fetching survey responses:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



router.get("/list", verifyToken, async (req, res) => {
  try {
    const { role, company_id } = req.user;

    // Admin only (optional)
    if (role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const surveySessions = await knex("surveysession")
      .where("company_id", company_id)
      .orderBy("createdAt", "desc");

    return res.status(200).json({
      success: true,
      data: surveySessions
    });

  } catch (error) {
    console.error("Error fetching survey sessions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch survey sessions",
      error: error.message
    });
  }
});


module.exports = router;
