const express = require("express");
const router = express.Router();
const knex = require("../db/db");
const { verifyToken } = require("../middleware/auth");


// router.get("/dashboard", verifyToken, async (req, res) => {
//   const { id: employeeId, role, company_id } = req.user;

//   if (role !== "employee") {
//     return res.status(403).json({ error: "Access denied" });
//   }

//   try {
//     // 1️⃣ Today Happiness
//     const todayScore = await knex("SurveyResponses as sr")
//       .join("employees as e", "sr.employeeId", "e.id")
//       .where("sr.employeeId", employeeId)
//       .andWhere("e.company_id", company_id)
//       .andWhereRaw("DATE(sr.createdAt) = CURDATE()")
//       .avg("sr.score as score")
//       .first();

//     const todayHappiness = todayScore?.score ? Number(todayScore.score) : 0;

//     // 2️⃣ Weekly Average
//     const weeklyAvg = await knex("SurveyResponses as sr")
//       .join("employees as e", "sr.employeeId", "e.id")
//       .where("sr.employeeId", employeeId)
//       .andWhere("e.company_id", company_id)
//       .andWhere("sr.createdAt", ">", knex.raw("NOW() - INTERVAL 7 DAY"))
//       .avg("sr.score as score")
//       .first();

//     const weeklyAverage = weeklyAvg?.score ? Number(weeklyAvg.score) : 0;

//     // 3️⃣ Pending Surveys: status = "pending" & user hasn't responded
//     const pendingSurveys = await knex("SurveySession as s")
//       .leftJoin("SurveyResponses as r", function () {
//         this.on("s.id", "r.surveyId")
//           .andOn("r.employeeId", "=", employeeId);
//       })
//       .where("s.company_id", company_id)
//       .andWhere("s.status", "pending")
//       .whereNull("r.id")  // User hasn't responded
//       .select(
//         "s.id",
//         "s.title",
//         "s.message",
//         "s.createdAt",
//         "s.status",
//         knex.raw("NULL as currentScore"),
//         knex.raw("0 as hasResponded")
//       )
//       .orderBy("s.createdAt", "desc");

//     // 4️⃣ Responded Surveys: From SurveyResponses table (user has responded)
//     const respondedSurveys = await knex("SurveyResponses as sr")
//       .join("SurveySession as s", "sr.surveyId", "s.id")
//       .where("sr.employeeId", employeeId)
//       .andWhere("s.company_id", company_id)
//       .select(
//         "s.id",
//         "s.title",
//         "s.message",
//         "s.createdAt",
//         "s.status",
//         "sr.score as currentScore",
//         knex.raw("1 as hasResponded"),
//         "sr.createdAt as respondedAt"  // Optional: when they responded
//       )
//       .orderBy("sr.createdAt", "desc");

//     // 5️⃣ Notifications: Only from pending surveys
//     const notifications = pendingSurveys.slice(0, 10);
//     const notificationCount = pendingSurveys.length;

//     // 6️⃣ Happiness Trend
//     const happinessTrend = await knex("SurveyResponses as sr")
//       .join("employees as e", "sr.employeeId", "e.id")
//       .where("sr.employeeId", employeeId)
//       .andWhere("e.company_id", company_id)
//       .andWhere("sr.createdAt", ">", knex.raw("NOW() - INTERVAL 7 DAY"))
//       .select(
//         knex.raw("DATE(sr.createdAt) as date"),
//         "sr.score"
//       );

//     // 7️⃣ Mood Distribution
//     const moodDistribution = await knex("SurveyResponses as sr")
//       .join("employees as e", "sr.employeeId", "e.id")
//       .where("sr.employeeId", employeeId)
//       .andWhere("e.company_id", company_id)
//       .select("sr.score")
//       .count("sr.id as count")
//       .groupBy("sr.score");

//     // 8️⃣ Final Response
//     res.status(200).json({
//       todayHappiness,
//       weeklyAverage,
//       notificationCount,
//       notifications,           // Pending ones for bell icon
//       pendingSurveys,         // Surveys waiting (status = pending)
//       respondedSurveys,       // 🔥 NEW: Surveys user has already answered
//       happinessTrend,
//       moodDistribution
//     });

//   } catch (error) {
//     console.error("Dashboard Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

router.get("/dashboard", verifyToken, async (req, res) => {
  const { id: employeeId, role, company_id } = req.user;

  if (role !== "employee") {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    // 1️⃣ Today & Weekly Happiness (unchanged)
    const todayScore = await knex("SurveyResponses as sr")
      .join("employees as e", "sr.employeeId", "e.id")
      .where("sr.employeeId", employeeId)
      .andWhere("e.company_id", company_id)
      .andWhereRaw("DATE(sr.createdAt) = CURDATE()")
      .avg("sr.score as score")
      .first();
    const todayHappiness = todayScore?.score ? Number(todayScore.score) : 0;

    const weeklyAvg = await knex("SurveyResponses as sr")
      .join("employees as e", "sr.employeeId", "e.id")
      .where("sr.employeeId", employeeId)
      .andWhere("e.company_id", company_id)
      .andWhere("sr.createdAt", ">", knex.raw("NOW() - INTERVAL 7 DAY"))
      .avg("sr.score as score")
      .first();
    const weeklyAverage = weeklyAvg?.score ? Number(weeklyAvg.score) : 0;

    // 2️⃣ FIXED: Pending Surveys = All surveys where current user hasn't responded yet
    //     (regardless of overall status)
    const pendingSurveys = await knex("SurveySession as s")
      .leftJoin("SurveyResponses as r", function () {
        this.on("s.id", "r.surveyId")
          .andOn("r.employeeId", "=", employeeId);
      })
      .where("s.company_id", company_id)
      // 🔥 Removed: .andWhere("s.status", "pending")  ← இதுதான் பிரச்சனை!
      .whereNull("r.id")  // Only surveys user hasn't answered
      .select(
        "s.id",
        "s.title",
        "s.message",
        "s.createdAt",
        "s.status",
        "s.allowAnonymous",
        knex.raw("NULL as currentScore"),
        knex.raw("0 as hasResponded")
      )
      .orderBy("s.createdAt", "desc");

    // 3️⃣ Responded Surveys (unchanged — already correct)
    const respondedSurveys = await knex("SurveyResponses as sr")
      .join("SurveySession as s", "sr.surveyId", "s.id")
      .where("sr.employeeId", employeeId)
      .andWhere("s.company_id", company_id)
      .select(
        "s.id",
        "s.title",
        "s.message",
        "s.createdAt",
        "s.status",
        "s.allowAnonymous",
        "sr.score as currentScore",
        knex.raw("1 as hasResponded"),
        "sr.createdAt as respondedAt"
      )
      .orderBy("sr.createdAt", "desc");

    // 4️⃣ Notifications & Count
    const notifications = pendingSurveys.slice(0, 10);
    const notificationCount = pendingSurveys.length;

    // 5️⃣ Happiness Trend & Mood Distribution (unchanged)
    const happinessTrend = await knex("SurveyResponses as sr")
      .join("employees as e", "sr.employeeId", "e.id")
      .where("sr.employeeId", employeeId)
      .andWhere("e.company_id", company_id)
      .andWhere("sr.createdAt", ">", knex.raw("NOW() - INTERVAL 7 DAY"))
      .select(knex.raw("DATE(sr.createdAt) as date"), "sr.score");

    const moodDistribution = await knex("SurveyResponses as sr")
      .join("employees as e", "sr.employeeId", "e.id")
      .where("sr.employeeId", employeeId)
      .andWhere("e.company_id", company_id)
      .select("sr.score")
      .count("sr.id as count")
      .groupBy("sr.score");

    // 6️⃣ Response
    res.status(200).json({
      todayHappiness,
      weeklyAverage,
      notificationCount,
      notifications,
      pendingSurveys,         // Now: All surveys user hasn't answered (even if others have)
      respondedSurveys,       // User's answered surveys
      happinessTrend,
      moodDistribution
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});   


router.get("/admin-dashboard", verifyToken, async (req, res) => {
  const { role, company_id } = req.user;

  if (role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    // 1️⃣ Total Employees (company based)
    const totalEmployeesData = await knex("employees")
      .where("company_id", company_id)
      .count("id as count")
      .first();
    const totalEmployees = parseInt(totalEmployeesData?.count || 0);

    // 2️⃣ Average Happiness (company based)
    const avgHappinessData = await knex("SurveyResponses as sr")
      .join("employees as e", "sr.employeeId", "e.id")
      .where("e.company_id", company_id)
      .whereNotNull("sr.score")
      .avg("sr.score as avgScore")
      .first();
    const avgHappiness = parseFloat(avgHappinessData?.avgScore || 0);

    // 3️⃣ Departments with employee count
    const departmentsData = await knex("departments")
      .where("company_id", company_id)
      .select("departmentName as department")
      .count("id as count")
      .groupBy("departmentName");
    const departments = departmentsData.map(d => ({
      department: d.department,
      count: parseInt(d.count)
    }));

    // 4️⃣ Trends (company based)
    const dailyRaw = await knex("SurveyResponses as sr")
      .join("employees as e", "sr.employeeId", "e.id")
      .where("e.company_id", company_id)
      .whereNotNull("sr.score")
      .where("sr.createdAt", ">", knex.raw("NOW() - INTERVAL 7 DAY"))
      .select(knex.raw("DATE(sr.createdAt) as day"))
      .avg("sr.score as avgScore")
      .groupByRaw("DATE(sr.createdAt)")
      .orderBy("day", "asc");

    const daily = dailyRaw.map(i => ({
      day: i.day,
      avgScore: parseFloat(i.avgScore)
    }));

    // 5️⃣ Latest scores per employee (company based)
    const latestScores = knex("SurveyResponses as r1")
      .join("employees as e", "r1.employeeId", "e.id")
      .where("e.company_id", company_id)
      .whereNotNull("r1.employeeId")
      .whereRaw(`
        r1.createdAt = (
          SELECT MAX(r2.createdAt)
          FROM SurveyResponses r2
          WHERE r2.employeeId = r1.employeeId
        )
      `)
      .select("r1.employeeId", "r1.score");

    // 6️⃣ Gender-wise
    const genderRaw = await knex("employees as e")
      .join(latestScores.clone().as("ls"), "e.id", "ls.employeeId")
      .where("e.company_id", company_id)
      .select("e.gender")
      .count("ls.employeeId as respondedCount")
      .avg("ls.score as avgScore")
      .groupBy("e.gender");

    const genderScore = genderRaw.map(i => ({
      gender: i.gender,
      respondedCount: parseInt(i.respondedCount),
      avgScore: parseFloat(i.avgScore)
    }));

    // 7️⃣ Department-wise
    const deptRaw = await knex("employees as e")
      .join(latestScores.clone().as("ls"), "e.id", "ls.employeeId")
      .where("e.company_id", company_id)
      .select("e.department", "e.gender")
      .count("ls.employeeId as respondedCount")
      .avg("ls.score as avgScore")
      .groupBy("e.department", "e.gender");

    const departmentDetails = deptRaw.map(i => ({
      department: i.department,
      gender: i.gender,
      respondedCount: parseInt(i.respondedCount),
      avgScore: parseFloat(i.avgScore)
    }));

    // 8️⃣ Employee List
    const employeeRaw = await knex("employees as e")
      .where("e.company_id", company_id)
      .leftJoin(latestScores.clone().as("ls"), "e.id", "ls.employeeId")
      .select(
        "e.full_name",
        "e.department",
        "e.designation",
        "e.gender",
        "e.id",
        "e.whatsapp",
        "e.email",
        knex.raw("IFNULL(ls.score,0) as happiness")
      );

    const employeeList = employeeRaw.map(e => ({
      ...e,
      happiness: parseFloat(e.happiness)
    }));

    res.json({
      totalEmployees,
      avgHappiness,
      departments,
      trends: { daily },
      genderScore,
      departmentDetails,
      employeeList
    });

  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/test-sessions", async (req, res) => {
  try {
    const data = await knex("surveysession").select("*");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/debug-responses", async (req, res) => {
  const data = await knex("SurveyResponses").select("id", "surveyId", "employeeId", "score");
  res.json(data);
});


router.get("/whoami", verifyToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;