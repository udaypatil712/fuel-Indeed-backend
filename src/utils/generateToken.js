import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      // email: user.email,
      refId: user.refId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
};

// exports.adminToken = (user) => {
//   return jwt.sign(
//     {
//       id: user._id,
//       email: user.email,
//       name: user.name,
//       petrolQuantity: user.petrolQuantity,
//       diselQuantity: user.diselQuantity,
//     },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );
// };
