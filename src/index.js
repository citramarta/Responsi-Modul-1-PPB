import express from "express";
import dotenv from "dotenv";
import loanRoutes from "./routes/loanRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Library Loan API berjalan",
    endpoints: { loans: "/loans" },
  });
});

app.use("/loans", loanRoutes);

// Route tidak dikenal
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
  });
});

// Penanganan error terpusat (mis. JSON body tidak valid)
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Body request bukan JSON yang valid" });
  }
  console.error(err);
  res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
});

// Di Vercel, app di-export sebagai handler; listen hanya dipakai saat lokal.
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;