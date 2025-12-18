const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const transporter = require("./mailTransporter");

const sendSurveyMail = async ({ to, fullName, title, message, surveyId, allowAnonymous }) => {
  // 1️⃣ Load template
  const templatePath = path.join(__dirname, "../templates/surveyEmail.html");
  const source = fs.readFileSync(templatePath, "utf8");

  // 2️⃣ Compile template with Handlebars
  const template = handlebars.compile(source);

  // 3️⃣ Generate HTML with dynamic data
  const html = template({
    fullName,
    title,
    message,
    surveyLink: `https://hes.procease.co/login`,
    allowAnonymous
  });

  // 4️⃣ Send mail
  await transporter.sendMail({
    from: `Happy Employee <${process.env.MAIL_USER}>`,
    to,
    subject: `New Survey: ${title}`,
    html
  });
};

module.exports = { sendSurveyMail };
