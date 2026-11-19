require("dotenv").config();

const express = require("express");
const app = express();

const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 2
});

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started (http://localhost:3000/) !");
});

const sql_create = `CREATE TABLE IF NOT EXISTS Books (
  book_id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  author VARCHAR(100) NOT NULL,
  comments TEXT
)`;

const sql_seed = `INSERT INTO Books (title, author, comments)
  SELECT * FROM (VALUES
    ('The Hobbit', 'J. R. R. Tolkien', 'Bilbo Baggins joins a company of dwarves on a quest to reclaim their home from a dragon'),
    ('Dune', 'Frank Herbert', 'Politics, religion and ecology on the desert planet Arrakis'),
    ('Fahrenheit 451', 'Ray Bradbury', 'A fireman whose job is to burn books begins to question his world')
  ) AS seed(title, author, comments)
  WHERE NOT EXISTS (SELECT 1 FROM Books)`;

pool.query(sql_create, [], (err, result) => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful creation of the 'Books' table");

  pool.query(sql_seed, [], (err, result) => {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Seed books inserted: ${result.rowCount}`);
  });
});

const showError = (res, message, status = 500) => {
  res.status(status).render("error", { message: message });
};

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/data", (req, res) => {
  const test = {
    title: "Test",
    items: ["one", "two", "three"]
  };
  res.render("data", { model: test });
});

app.get("/books", (req, res) => {
  const sql = "SELECT * FROM Books ORDER BY title";
  pool.query(sql, [], (err, result) => {
    if (err) {
      return showError(res, err.message);
    }
    res.render("books", { model: result.rows });
  });
});

app.get("/edit/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM Books WHERE book_id = $1";
  pool.query(sql, [id], (err, result) => {
    if (err) {
      return showError(res, err.message);
    }
    if (result.rows.length === 0) {
      return showError(res, `Book ${id} was not found`, 404);
    }
    res.render("edit", { model: result.rows[0] });
  });
});

app.post("/edit/:id", (req, res) => {
  const id = req.params.id;
  const book = [req.body.title, req.body.author, req.body.comments, id];
  const sql = "UPDATE Books SET title = $1, author = $2, comments = $3 WHERE (book_id = $4)";
  pool.query(sql, book, (err, result) => {
    if (err) {
      return showError(res, err.message);
    }
    res.redirect("/books");
  });
});

app.get("/create", (req, res) => {
  res.render("create", { model: {} });
});

app.post("/create", (req, res) => {
  const sql = "INSERT INTO Books (title, author, comments) VALUES ($1, $2, $3)";
  const book = [req.body.title, req.body.author, req.body.comments];
  pool.query(sql, book, (err, result) => {
    if (err) {
      return showError(res, err.message);
    }
    res.redirect("/books");
  });
});

app.get("/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM Books WHERE book_id = $1";
  pool.query(sql, [id], (err, result) => {
    if (err) {
      return showError(res, err.message);
    }
    if (result.rows.length === 0) {
      return showError(res, `Book ${id} was not found`, 404);
    }
    res.render("delete", { model: result.rows[0] });
  });
});

app.post("/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM Books WHERE book_id = $1";
  pool.query(sql, [id], (err, result) => {
    if (err) {
      return showError(res, err.message);
    }
    res.redirect("/books");
  });
});
