const express = require('express');
const router = express.Router();
const db = require('../db/db'); // Your Knex database connection
const { verifyToken } = require('../middleware/auth');
const { profilePictureUpload } = require('../middleware/upload'); 
//const multer = require('multer');

// GET /profile

// router.get('/profile', verifyToken, async (req, res) => {
//   try {
//     const { email, role } = req.user;

//     let tableName;
//     if (role === 'admin') tableName = 'admins';
//     else if (role === 'employee') tableName = 'employees';
//     else return res.status(403).json({ error: 'Invalid role' });

//     const user = await db(tableName).where({ email }).first();
//     if (!user) return res.status(404).json({ error: `${role} not found` });

//     // Construct full URL for profile picture if it exists
//     let profilePictureUrl = null;
//     if (user.profile_picture) {
//       profilePictureUrl = `${req.protocol}://${req.get('host')}${user.profile_picture}`;
//     }

//     res.status(200).json({
//       user: {
//         userId: user.id,
//         companyId: user.company_id || null,
//         name: user.full_name || "",
//         email: user.email || "",
//         role: role,
//         department: user.department || "",
//         designation: user.designation || "",
//         profilePicture: profilePictureUrl,
         
//       }
//     });

//   } catch (err) {
//     console.error('Error fetching profile:', err);
//     res.status(500).json({ error: 'Failed to fetch profile' });
//   }
// });


router.get("/profile", verifyToken, async (req, res) => {
  try {
    const { email, role } = req.user;

    let tableName;
    if (role === "admin") tableName = "admins";
    else if (role === "employee") tableName = "employees";
    else {
      return res.status(403).json({ error: "Invalid role" });
    }

    // 1️⃣ Get user
    const user = await db(tableName).where({ email }).first();
    if (!user) {
      return res.status(404).json({ error: `${role} not found` });
    }

    // 2️⃣ Profile picture full URL
    let profilePictureUrl = null;
    if (user.profile_picture) {
      profilePictureUrl = `${req.protocol}://${req.get("host")}${user.profile_picture}`;
    }

    // 3️⃣ Admin → fetch company name
    let companyName = null;
    if (role === "admin" && user.company_id) {
      const company = await db("companies")
        .select("companyName")
        .where({ id: user.company_id })
        .first();

      companyName = company ? company.companyName : null;
    }

    // 4️⃣ Response
    res.status(200).json({
      user: {
        userId: user.id,
        companyId: user.company_id || null,
        companyName: role === "admin" ? companyName : null, // 🔥 admin only
        name: user.full_name || "",
        email: user.email || "",
        role,
        department: role === "employee" ? user.department || "" : null,
        designation: role === "employee" ? user.designation || "" : null,
        profilePicture: profilePictureUrl
        
      }
    });

  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});



// PUT Route - Full Profile Update with Photo Upload
// router.put('/profile', verifyToken, profilePictureUpload.single('profilePicture'), async (req, res) => {
//   try {
//     const { email: currentEmail, id: userId, role } = req.user; // From JWT
//     const { name, email: newEmail, department, designation } = req.body; // Text fields from frontend

//     // Choose table
//     let tableName;
//     if (role === 'admin') tableName = 'admins';
//     else if (role === 'employee') tableName = 'employees';
//     else return res.status(403).json({ error: 'Invalid role' });

//     // Prepare update data
//     const updateData = {
//       full_name: name?.trim(),           // Map "name" → "full_name" column
//       department: department?.trim(),
//       designation: designation?.trim(),
//       updated_at: db.fn.now()
//     };

//     // Optional: Allow email update
//     if (newEmail?.trim()) {
//       updateData.email = newEmail.trim();
//     }

//     // Handle profile picture upload (from Multer)
//     if (req.file) {
//       const photoUrl = `/uploads/profiles/${req.file.filename}`;
//       updateData.profile_picture = photoUrl; // Save to DB column
//     }

//     // If no fields to update (including photo)
//     if (Object.keys(updateData).length === 0) {
//       return res.status(400).json({ error: "No changes made or user not found" });
//     }

//     // Update user
//     const updated = await db(tableName)
//       .where({ email: currentEmail })
//       .update(updateData);

//     if (!updated) {
//       return res.status(400).json({ error: "Update failed" });
//     }

//     // Fetch updated user (use new email if changed)
//     const searchEmail = newEmail?.trim() || currentEmail;
//     const user = await db(tableName).where({ email: searchEmail }).first();

//     if (!user) {
//       return res.status(404).json({ error: "Updated user not found" });
//     }

//     res.status(200).json({
//       message: "Profile updated successfully",
//       user: {
//         userId: user.id,
//         companyId: user.company_id || null,
//         name: user.full_name,           // Return as "name"
//         email: user.email,
//         role: role,
//         department: user.department,
//         designation: user.designation,
//         profilePicture: user.profile_picture || null  // 🔥 Returns dynamic photo URL to frontend
//       }
//     });

//   } catch (err) {
//     console.error("Error updating profile:", err);

//     // Handle Multer-specific errors
//     if (err instanceof multer.MulterError) {
//       if (err.code === 'LIMIT_FILE_SIZE') {
//         return res.status(400).json({ error: "File too large. Maximum 5MB allowed." });
//       }
//     }
//     if (err.message.includes('Only image files')) {
//       return res.status(400).json({ error: err.message });
//     }

//     res.status(500).json({ error: "Failed to update profile" });
//   }
// });

const multer = require("multer");

router.put(
  "/profile",
  verifyToken,
  profilePictureUpload.single("profilePicture"),
  async (req, res) => {
    try {
      const { email: currentEmail, id: userId, role } = req.user;
      const { name, email: newEmail, department, designation } = req.body;

      let tableName;
      if (role === "admin") tableName = "admins";
      else if (role === "employee") tableName = "employees";
      else {
        return res.status(403).json({ error: "Invalid role" });
      }

      // 🔹 Base update fields (common)
      const updateData = {
        full_name: name?.trim(),
        updated_at: db.fn.now()
      };

      // 🔹 Email update
      if (newEmail?.trim()) {
        updateData.email = newEmail.trim();
      }

      // 🔹 Employee-only fields
      if (role === "employee") {
        if (department) updateData.department = department.trim();
        if (designation) updateData.designation = designation.trim();
      }

      // 🔹 Profile picture
      if (req.file) {
        updateData.profile_picture = `/uploads/profiles/${req.file.filename}`;
      }

      // Remove undefined values
      Object.keys(updateData).forEach(
        key => updateData[key] === undefined && delete updateData[key]
      );

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No changes made" });
      }

      const updated = await db(tableName)
        .where({ email: currentEmail })
        .update(updateData);

      if (!updated) {
        return res.status(400).json({ error: "Update failed" });
      }

      const searchEmail = newEmail?.trim() || currentEmail;
      const user = await db(tableName).where({ email: searchEmail }).first();

      if (!user) {
        return res.status(404).json({ error: "Updated user not found" });
      }

      res.status(200).json({
        message: "Profile updated successfully",
        user: {
          userId: user.id,
          companyId: user.company_id || null,
          name: user.full_name,
          email: user.email,
          role,
          department: role === "employee" ? user.department : null,
          designation: role === "employee" ? user.designation : null,
          profilePicture: user.profile_picture || null
        }
      });

    } catch (err) {
      console.error("Error updating profile:", err);

      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: "File too large. Maximum 5MB allowed."
          });
        }
      }

      if (err.message.includes("Only image files")) {
        return res.status(400).json({ error: err.message });
      }

      res.status(500).json({ error: "Failed to update profile" });
    }
  }
);


module.exports = router;
