import Seller from "../models/Seller.js";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid"; 
// LOGIN (plain password check) 
export const loginSeller = (req, res) => {
  const { email, password } = req.body;

  Seller.findByEmail(email, async (err, seller) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!seller) return res.status(401).json({ error: "Seller not found" });

    try {
      // ✅ Compare hashed password
      const isMatch = await bcrypt.compare(password, seller.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: seller.id },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "1d" }
      );

      res.json({
        message: "Login successful",
        token,
        seller: {
          id: seller.id,
          email: seller.email,
          store_id: seller.store_id,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
};

// REGISTER
export const registerSeller = async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  // ✅ Basic validation
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ error: "Password and Confirm Password do not match" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newSeller = {
      email,
      password: hashedPassword,
      store_id: uuidv4(), // ✅ generate unique store_id
    };

    Seller.create(newSeller, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error" });
      }

      res.json({
        message: "Seller registered successfully",
        seller: result, // includes store_id
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
export const getSellerById = (req, res) => {
  const seller_id = parseInt(req.params.id, 10);

  const sql = "SELECT id, email, store_id FROM sellers WHERE id = ?";
  db.query(sql, [seller_id], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Seller not found" });
    }
    res.json(results[0]); // ✅ includes store_id
  });
};
export const getSellerStoreIdByEmail = (req, res) => {
  const { email } = req.params; // ya req.query.email, jo bhi route decide karo

  const sql = "SELECT store_id FROM sellers WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Seller not found" });
    }
    res.json({ store_id: results[0].store_id });
  });
};
