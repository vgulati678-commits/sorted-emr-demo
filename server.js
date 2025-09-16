const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const PDFDocument = require("pdfkit");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const db = new sqlite3.Database(":memory:");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: "emr_secret", resave: false, saveUninitialized: true }));

// Create tables
db.serialize(() => {
  db.run("CREATE TABLE patients (id INTEGER PRIMARY KEY, name TEXT, age INT, sex TEXT, bp TEXT, vitals TEXT)");
});

// Middleware auth check
function checkRole(role) {
  return (req, res, next) => {
    if (req.session.user && req.session.user.role === role) return next();
    res.redirect("/");
  };
}

// Routes
app.get("/", (req, res) => res.render("login"));
app.post("/login", (req, res) => {
  const { username } = req.body;
  if (username === "admin") req.session.user = { role: "admin" };
  else if (username === "doctor") req.session.user = { role: "doctor" };
  else if (username === "receptionist") req.session.user = { role: "receptionist" };
  res.redirect("/dashboard");
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.render("dashboard", { role: req.session.user.role });
});

// Receptionist adds patient
app.post("/add-patient", checkRole("receptionist"), (req, res) => {
  const { name, age, sex, bp, vitals } = req.body;
  db.run("INSERT INTO patients (name, age, sex, bp, vitals) VALUES (?,?,?,?,?)", [name, age, sex, bp, vitals]);
  res.redirect("/dashboard");
});

// Doctor views patients
app.get("/patients", checkRole("doctor"), (req, res) => {
  db.all("SELECT * FROM patients", (err, rows) => res.render("patients", { patients: rows }));
});

// Doctor generates prescription
app.post("/prescribe/:id", checkRole("doctor"), (req, res) => {
  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=prescription.pdf");
  doc.text("Prescription for Patient ID: " + req.params.id);
  doc.text("Medicine: " + req.body.medicine);
  doc.pipe(res);
  doc.end();
});

// Admin dummy toggle
app.get("/admin", checkRole("admin"), (req, res) => {
  res.send("Admin Panel - Toggle doctors (dummy)");
});

app.listen(3000, () => console.log("Sorted EMR demo running on http://localhost:3000"));
