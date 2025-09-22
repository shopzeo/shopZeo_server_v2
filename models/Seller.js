import db from "../config/db.js";

const Seller = {
  // Find seller by email
  findByEmail: (email, callback) => {
    const sql = "SELECT * FROM sellers WHERE email = ?";
    db.query(sql, [email], (err, results) => {
      if (err) return callback(err, null);
      callback(null, results[0]); // single seller object
    });
  },

  // Create new seller
  create: (seller, callback) => {
    const sql =
      "INSERT INTO sellers (email, password, store_id) VALUES (?, ?, ?)";
    db.query(
      sql,
      [seller.email, seller.password, seller.store_id],
      (err, result) => {
        if (err) return callback(err, null);
        callback(null, { id: result.insertId, ...seller });
      }
    );
  },

  // Find seller by ID
  findById: (id, callback) => {
    const sql = "SELECT id, email, store_id FROM sellers WHERE id = ?";
    db.query(sql, [id], (err, results) => {
      if (err) return callback(err, null);
      callback(null, results[0]);
    });
  },

  // Get all sellers
  findAll: (callback) => {
    const sql = "SELECT id, email, store_id FROM sellers";
    db.query(sql, (err, results) => {
      if (err) return callback(err, null);
      callback(null, results);
    });
  },
};

export default Seller;
