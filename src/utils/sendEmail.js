import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, subject, htmlContent) {
  try {
    await resend.emails.send({
      from: "Fuel Indeed <uday@fuelindeed.in>", // default sender
      to: [to], // send to other account
      subject,
      html: htmlContent,
    });

    console.log("Email sent to:", to);
  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
}

export default sendEmail;
