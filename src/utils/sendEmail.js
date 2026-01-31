import nodemailer from "nodemailer";

async function sendEmail(to, subject, htmlContent) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.OWNER_EMAIL,
      pass: process.env.PASSWORD_KEY,
    },
  });

  await transporter.sendMail({
    from: `Fuel Indeed <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    html: htmlContent,
  });
}

export default sendEmail;
