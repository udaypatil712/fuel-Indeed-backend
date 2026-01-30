import axios from "axios";

export async function sendWhatsAppMessage(phone) {
  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.NUMBER_ID;

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const cleanPhone = phone.replace(/\D/g, "");
    const finalPhone = cleanPhone.startsWith("91")
      ? cleanPhone
      : `91${cleanPhone}`;

    const res = await axios.post(
  url,
  {
    messaging_product: "whatsapp",
    to: finalPhone,
    type: "template",
    template: {
      name: "hello_world",
      language: {
        code: "en_US",
      },
    },
  },
  { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
);


    console.log("✅ WhatsApp API Response:", res.data);
  } catch (err) {
    console.error("❌ WhatsApp Error:", err.response?.data || err.message);
  }
}
