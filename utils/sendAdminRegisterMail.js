const fs = require("fs");
const path = require("path");
const transporter = require("./mailTransporter");
const handlebars = require("handlebars");

const sendAdminRegisterMail = async ({ to, adminName, email, password }) => {
    const companyName = "Happy Employee"; // ✅ Hardcoded

    // 1️⃣ Load HTML template
    const templatePath = path.join(__dirname, "../templates/adminRegister.html");
    const source = fs.readFileSync(templatePath, "utf8");

    // 2️⃣ Compile template with Handlebars
    const template = handlebars.compile(source);

    // 3️⃣ Generate HTML with dynamic values
    const html = template({
        companyName,  // Always "Happy Employee"
        adminName,
        email,
        password,
        year: new Date().getFullYear()
    });

    // 4️⃣ Send email
    await transporter.sendMail({
        from: `"${companyName} Support" <${process.env.MAIL_USER}>`,
        to,
        subject: `Welcome to ${companyName}`,
        html
    });
};

module.exports = {
  sendAdminRegisterMail
};
