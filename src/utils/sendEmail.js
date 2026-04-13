import { Resend } from "resend";

async function sendEmail(to, subject, htmlContent) {
  try {
    // Create client when function runs (after env is loaded)
    const resend = new Resend(process.env.RESEND_API_KEY);

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing");
    }

    await resend.emails.send({
      from: "Fuel Indeed <onboarding@resend.dev>",
      to: [to],
      subject,
      html: htmlContent,
    });

    // console.log("Email sent to:", to);
  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
}

export default sendEmail;
