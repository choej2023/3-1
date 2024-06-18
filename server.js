const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 5189;

const uploadDirectory = path.join(__dirname, "UploadedFiles");

app.use(express.json());

// MySQL 데이터베이스 연결 설정
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "clubmanagement",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to database");
});

// 로그인 요청 처리
app.post("/api/login", (req, res) => {
  const { Username, Password } = req.body;

  const sql =
    "SELECT StudentID FROM student WHERE Username = ? AND Password = ?";
  db.query(sql, [Username, Password], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length > 0) {
      const StudentID = results[0].StudentID;
      res.json({ Success: true, StudentID });
    } else {
      res
        .status(401)
        .json({ Success: false, message: "Invalid ID or Password" });
    }
  });
});

// 회원가입 엔드포인트
app.post('/api/register', (req, res) => {
  const { StudentNumber, UserName, Password, Year, Name, Role, Department } = req.body;

  // 입력 데이터 확인
  if (!StudentNumber || !UserName || !Password || !Year || !Name || !Role || !Department) {
      return res.status(400).json({ error: '모든 필드를 입력하세요.' });
  }

  const sql = 'INSERT INTO Student (studentNumber, userName, password, year, name, role, department) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const values = [StudentNumber, UserName, Password, Year, Name, Role, Department];

  db.query(sql, values, (err, results) => {
      if (err) {
          console.error('데이터 삽입 오류:', err);
          return res.status(500).json({ error: '데이터 삽입 실패' });
      }
      res.status(201).json({ message: '회원가입이 성공적으로 완료되었습니다.' });
  });
});

// 클럽 정보 요청 처리
app.get("/api/clubs", (req, res) => {
  const sql = `
      SELECT DISTINCT Club.*, COUNT(clubmember.ClubID) as count
      FROM Club
      INNER JOIN ClubApplicationForm ON Club.StudentID = ClubApplicationForm.StudentID AND Club.ClubID = ClubApplicationForm.ClubID
      LEFT JOIN clubmember ON Club.ClubID = clubmember.ClubID
      WHERE ClubApplicationForm.isAccepted = TRUE
      GROUP BY Club.ClubID;
    `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).send(err);

    res.json(results);
  });
});

// 클럽 등록
app.post('/api/clubs', (req, res) => {
  const { StudentID, ClubName, ShortDescription, Description, maxCount, ImagePath } = req.body;

  const query = `
      INSERT INTO Club (StudentID, ClubName, ShortDescription, Description, MaxCount, ImagePath)
      VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [StudentID, ClubName, ShortDescription, Description, maxCount, ImagePath], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: 'Failed to create club' });
      }
      const newClubId = result.insertId;
      res.status(201).json({ success: true, ClubID: newClubId });
  });
});



app.post('/api/clubapplicationforms', (req, res) => {
  const { StudentID, ClubID, StudentNumber, Department, Year, Name, MemberCount } = req.body;

  const query = `
      INSERT INTO ClubApplicationForm (StudentID, ClubID, StudentNumber, Department, Year, Name, MemberCount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [StudentID, ClubID, StudentNumber, Department, Year, Name, MemberCount], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: 'Failed to submit club application form' });
      }
      res.status(201).json({ success: true });
  });
});


app.post('/api/clubstatus', (req, res) => {
  const { sid } = req.body;
  const query = `
      SELECT * FROM ClubApplicationForm WHERE StudentID = ?
  `;

  db.query(query, [sid], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});



// 파일 업로드를 위한 디렉토리 생성
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 파일 업로드 엔드포인트
app.post("/api/files/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  res.send({ filePath: req.file.path });
});

// 이미지 조회 엔드포인트
app.get("/api/files/images/:fileName", (req, res) => {
  const filePath = path.join(uploadDirectory, req.params.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found.");
  }
  res.sendFile(filePath);
});

// 파일 다운로드 엔드포인트
app.get("/api/files/download/:fileName", (req, res) => {
  const filePath = path.join(uploadDirectory, req.params.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found.");
  }
  res.download(filePath);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
