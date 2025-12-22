const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const transporter = require("./mailTransporter");

const sendResetPasswordMail = async ({ to, fullName, email, password }) => {
    const companyName = "Happy Employee"; // ✅ Hardcoded

    // 1️⃣ Load the HTML template
    const templatePath = path.join(__dirname, "../templates/resetPassword.html");
    const source = fs.readFileSync(templatePath, "utf8");

    // 2️⃣ Compile template with Handlebars
    const template = handlebars.compile(source);

    // 3️⃣ Generate HTML with dynamic data
    const html = template({
        companyName,      // Always "Happy Employee"
        fullName,
        email,
        password,
        year: new Date().getFullYear()
    });

    // 4️⃣ Send email
    await transporter.sendMail({
        from: `"${companyName}" <${process.env.MAIL_USER}>`,
        to,
        subject: "Password Reset Information",
        html
    });
};

module.exports = { sendResetPasswordMail };
