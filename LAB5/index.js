const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const COMMENT_FILE = path.join(__dirname, "comment.json");

const app = express();
const db = new sqlite3.Database("product.db");

app.use(express.static(path.join(__dirname)));
app.use(express.json()); // POST 요청 파싱용

// 영화 전체 리스트 및 필터링 (키워드 + 정렬)
app.get("/api/movies", (req, res) => {
  const keyword = req.query.keyword ? `%${req.query.keyword}%` : "%";
  const sort = req.query.sort;

  const sortOptions = {
    "rating-desc": "movie_rate DESC",
    "rating-asc": "movie_rate ASC",
    "date-desc": "movie_release_date DESC",
    "date-asc": "movie_release_date ASC"
  };
  const orderBy = sortOptions[sort] || "movie_id ASC";

  const sql = `
    SELECT * FROM movies 
    WHERE movie_title LIKE ? 
       OR movie_overview LIKE ? 
       OR movie_release_date LIKE ?
    ORDER BY ${orderBy}
  `;

  db.all(sql, [keyword, keyword, keyword], (err, rows) => {
    if (err) {
      console.error("DB error:", err);
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// 단일 영화 상세정보 조회
app.get("/api/movies/:id", (req, res) => {
  const movieId = req.params.id;
  const sql = "SELECT * FROM movies WHERE movie_id = ?";
  db.get(sql, [movieId], (err, row) => {
    if (err) {
      console.error("DB error:", err);
      res.status(500).json({ error: err.message });
    } else {
      res.json(row);
    }
  });
});

// 댓글 가져오기
app.get("/api/comments/:movie_id", (req, res) => {
  const movieId = req.params.movie_id;

  fs.readFile(COMMENT_FILE, "utf-8", (err, data) => {
    if (err) return res.status(500).json({ error: "파일 읽기 실패" });

    const comments = JSON.parse(data);
    res.json(comments[movieId] || []);
  });
});

// 댓글 추가
app.post("/api/comments/:movie_id", (req, res) => {
  const movieId = req.params.movie_id;
  const newComment = req.body.comment;

  if (!newComment || newComment.trim() === "") {
    return res.status(400).json({ error: "댓글 내용이 비어있습니다." });
  }

  fs.readFile(COMMENT_FILE, "utf-8", (err, data) => {
    if (err) return res.status(500).json({ error: "파일 읽기 실패" });

    const comments = JSON.parse(data);
    if (!comments[movieId]) {
      comments[movieId] = [];
    }

    comments[movieId].push(newComment.trim());

    fs.writeFile(COMMENT_FILE, JSON.stringify(comments, null, 2), (err) => {
      if (err) return res.status(500).json({ error: "파일 저장 실패" });
      res.json({ success: true, comments: comments[movieId] });
    });
  });
});

// 상세 페이지 라우팅 (RESTful /movies/:id → movie.html)
app.get("/movies/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "movie.html"));
});

// 서버 실행
app.listen(3000, () => {
  console.log("서버 실행 중: http://localhost:3000");
});
