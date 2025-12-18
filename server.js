const express = require("express");
const app = express();
const passport = require('./middleware/passport');
const db = require("./db/db");
const cors= require("cors");
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
require("dotenv").config();
// Middleware (must be before routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(passport.initialize());
const PORT = process.env.PORT || 5000;

// ROUTES
const demoRoutes = require("./Routes/demo");
const authRoutes = require("./Routes/auth");
const surveyRoutes = require("./Routes/survey");
const employeeRoutes = require("./Routes/employee");
const departmentRoutes = require("./Routes/department");
const profileRoutes = require("./Routes/profile");
const dashboardRoutes = require("./Routes/dashboard");



// BASE ROUTESA
app.use("/demo", demoRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/employees",employeeRoutes);
app.use("/api/departments",departmentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);

// DEFAULT TEST ROUTE
app.get("/", (req, res) => {
    res.status(200).json({ message: "Server running successfully 🚀" });
});

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
