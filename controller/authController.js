const db = require('../db/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, blacklistToken } = require('../middleware/auth');
const { sendAdminRegisterMail}=require('../utils/sendAdminRegisterMail');
const { sendResetPasswordMail } = require('../utils/sendResetPasswordMail');

// exports.registerAdmin = async (req, res) => {
//   const { companyName, adminName, email, password } = req.body;

//   if (!companyName || !adminName || !email || !password) {
//     return res.status(400).json({ error: "All fields are required" });
//   }

//   try {
//     // 1️⃣ Check if admin exists
//     const existingAdmin = await db("admins").where({ email }).first();
//     if (existingAdmin) {
//       return res.status(400).json({ error: "Admin already exists" });
//     }

//     // 2️⃣ Check if company exists or create it
//     let company = await db("companies").where({ companyName }).first();

//     if (!company) {
//       const [companyId] = await db("companies").insert({ companyName });
//       company = { id: companyId, companyName };
//     }

//     // 3️⃣ Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // 4️⃣ Create admin
//     const [adminId] = await db("admins").insert({
//       company_id: company.id,
//       full_name: adminName,
//       email,
//       password: hashedPassword
//     });

//     // 5️⃣ Send registration mail
//     await sendAdminRegisterMail({
//       to: email,
//       companyName: company.companyName, // ✅ fixed
//       adminName,
//       email,
//       password
//     });

//     // 6️⃣ Response
//     res.status(201).json({
//       success: true,
//       message: "Admin registered successfully and email sent",
//       user: {
//         userId: adminId,
//         companyId: company.id,
//         name: adminName,
//         email,
//         role: "admin"
//       }
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// };


exports.registerAdmin = async (req, res) => {
  const { companyName, adminName, email, password } = req.body;

  if (!companyName || !adminName || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // 1️⃣ Check if admin exists
    const existingAdmin = await db("admins").where({ email }).first();
    if (existingAdmin) {
      return res.status(409).json({ error: "Admin already exists" });
    }

    // 2️⃣ Check if company exists or create it
    let company = await db("companies").where({ companyName }).first();

    if (!company) {
      const [companyId] = await db("companies").insert({ companyName });
      company = { id: companyId, companyName };
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Create admin
    const [adminId] = await db("admins").insert({
      company_id: company.id,
      full_name: adminName,
      email,
      password: hashedPassword,
    });

    // 5️⃣ Generate JWT token ✅
    const token = jwt.sign(
      {
        userId: adminId,
        companyId: company.id,
        role: "admin",
        email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // 6️⃣ Send registration mail
    await sendAdminRegisterMail({
      to: email,
      companyName: company.companyName,
      adminName,
      email,
      password,
    });

    // 7️⃣ Response with token ✅
    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      token,
      user: {
        userId: adminId,
        companyId: company.id,
        name: adminName,
        email,
        role: "admin",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};




exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    let user = null;
    let role = null;

    // 1️⃣ Check Admins table
    const admin = await db("admins").where({ email }).first();
    if (admin) {
      user = admin;
      role = "admin";
    }

    // 2️⃣ Check Employees table only if not found in Admins
    if (!user) {
      const employee = await db("employees").where({ email }).first();
      if (employee) {
        user = employee;
        role = "employee";
      }
    }

    // 3️⃣ User not found
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 4️⃣ Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 5️⃣ Generate JWT including company_id
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role,
        company_id: user.company_id // always included
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 6️⃣ Response
    res.json({
      token,
      user: {
        userId: user.id,
        companyId: user.company_id,
        name: role === "admin" ? user.full_name : user.name,
        email: user.email,
        role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};



/**
 * Logout
 */
exports.logout = (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(400).json({ error: 'Authorization header missing' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(400).json({ error: 'Token missing' });

  blacklistToken(token);
  res.json({ message: 'Logged out successfully' });
};


exports.resetPassword = async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const { id: userId, role } = req.user;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password too short" });
  }

  try {
    const tableName = role === "admin" ? "admins" : "employees";

    // 1️⃣ Get user
    const user = await db(tableName).where({ id: userId }).first();
    if (!user) return res.status(404).json({ error: "User not found" });

    // 2️⃣ Compare current password with hash
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: "Current password incorrect" });

    // 3️⃣ Hash & update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db(tableName).where({ id: userId }).update({ password: hashedPassword });

    // 4️⃣ Get company name for email
    let companyName = "Your Company";

    if (role === "admin") {
      const company = await db("companies").where({ id: user.company_id }).first();
      if (company) companyName = company.companyName;
    } else {
      const admin = await db("admins").where({ company_id: user.company_id }).first();
      if (admin) {
        const company = await db("companies").where({ id: admin.company_id }).first();
        if (company) companyName = company.companyName;
      }
    }

    // 5️⃣ Send reset password email
    await sendResetPasswordMail({
      to: user.email,
      companyName,
      fullName: user.full_name || "User",
      email: user.email,
      password: newPassword
    });

    // 6️⃣ Response
    res.json({ success: true, message: "Password updated successfully and email sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


// exports.resetPassword = async (req, res) => {
//   const { currentPassword, newPassword, confirmNewPassword } = req.body;
//   const { id: userId, role } = req.user;

//   if (!currentPassword || !newPassword || !confirmNewPassword) {
//     return res.status(400).json({ error: "All fields are required" });
//   }

//   if (newPassword !== confirmNewPassword) {
//     return res.status(400).json({ error: "Passwords do not match" });
//   }

//   if (newPassword.length < 6) {
//     return res.status(400).json({ error: "Password too short" });
//   }

//   try {
//     // 1️⃣ Table select
//     const tableName = role === "admin" ? "admins" : "employees";

//     // 2️⃣ Get user
//     const user = await db(tableName).where({ id: userId }).first();
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // 3️⃣ Check current password
//     const isMatch = await bcrypt.compare(currentPassword, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ error: "Current password incorrect" });
//     }

//     // 4️⃣ Hash & update new password
//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     await db(tableName)
//       .where({ id: userId })
//       .update({ password: hashedPassword });

//     // 5️⃣ Get company name (for mail)
//     let companyName = "Company";
//     if (role === "admin") {
//       const company = await db("companies")
//         .where({ id: user.company_id })
//         .first();
//       if (company) companyName = company.company_name;
//     } else {
//       const admin = await db("admins")
//         .where({ company_id: user.company_id })
//         .first();
//       if (admin) {
//         const company = await db("companies")
//           .where({ id: admin.company_id })
//           .first();
//         if (company) companyName = company.company_name;
//       }
//     }

//     // 6️⃣ ✅ Send reset password mail (WITH PASSWORD)
//     await sendResetPasswordMail({
//       to: user.email,
//       companyName,
//       fullName: user.full_name || "User",
//       email: user.email,
//       password: newPassword
//     });

//     // 7️⃣ Response
//     res.json({
//       success: true,
//       message: "Password updated successfully and email sent"
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// };