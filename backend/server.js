require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const pool = require("./db");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =============================
   DB CONNECTION TEST
============================= */
pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.error("DB connection failed:", err);
  } else {
    console.log("DB connected at:", result.rows[0]);
  }
});

/* =============================
   ROUTES
============================= */

app.get("/", (req, res) => {
  res.send("Marvic_B API Running");
});

/* ========= SIGNUP ========= */
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO marvic_b_customers (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hashedPassword]
    );

    res.json(newUser.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }

    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

/* ========= LOGIN ========= */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query(
      "SELECT * FROM marvic_b_customers WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password_hash
    );

    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    res.json({
      id: user.rows[0].id,
      name: user.rows[0].name,
      email: user.rows[0].email
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ========= CREATE ORDER ========= */
app.post("/orders", async (req, res) => {
  const { customer_id, origin, destination, weight } = req.body;

  try {
    const newOrder = await pool.query(
      "INSERT INTO marvic_b_orders (customer_id, origin, destination, weight) VALUES ($1,$2,$3,$4) RETURNING *",
      [customer_id, origin, destination, weight]
    );

    res.json(newOrder.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

/* ========= GET ORDERS ========= */
app.get("/orders/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const orders = await pool.query(
      "SELECT * FROM marvic_b_orders WHERE customer_id = $1",
      [id]
    );

    res.json(orders.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch orders" });
  }
});

/* =============================
   START SERVER
============================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
