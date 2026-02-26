const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("./admin.model");

async function loginAdmin(email, password) {
  const admin = await Admin.findOne({ email });

  if (!admin) {
    throw new Error("Admin not found");
  }

  const isMatch = await bcrypt.compare(password, admin.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    {
      adminId: admin._id,
      role: admin.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { token };
}

module.exports = { loginAdmin };
