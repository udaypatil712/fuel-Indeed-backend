// import axios from "axios";

// export async function sendSMS(phone, message) {
//   try {
//     const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
//       headers: {
//         authorization: process.env.FAST2SMS_API_KEY,
//       },
//       params: {
//         route: "q",
//         message: message,
//         numbers: phone,
//       },
//     });

//     console.log("FAST2SMS FULL RESPONSE:", response.data);
//     return response.data;
//   } catch (error) {
//     console.error("FAST2SMS ERROR:", error.response?.data || error.message);
//     throw error;
//   }
// }
