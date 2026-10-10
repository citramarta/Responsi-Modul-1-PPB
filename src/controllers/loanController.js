import { LoanModel, today } from "../models/loanModel.js";

const STATUS_FILTERS = ["Dipinjam", "Dikembalikan", "Terlambat"];
const STATUS_VALUES = ["Dipinjam", "Dikembalikan"];
const TEXT_FIELDS = ["member_name", "member_number", "book_title"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const asString = (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

const isValidDate = (value) => {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

// Validasi body request. partial=false untuk POST, partial=true untuk PUT/PATCH.
const validateLoan = (body, { partial = false } = {}) => {
  const errors = [];
  const payload = {};
  const t = today();
  const src = body && typeof body === "object" && !Array.isArray(body) ? body : {};

  for (const field of TEXT_FIELDS) {
    if (src[field] === undefined) {
      if (!partial) errors.push(`${field} wajib diisi`);
      continue;
    }
    const value = typeof src[field] === "number" ? String(src[field]) : src[field];
    if (typeof value !== "string" || !value.trim()) {
      errors.push(`${field} harus berupa teks yang tidak kosong`);
      continue;
    }
    payload[field] = value.trim();
  }

  if (src.loan_date !== undefined) {
    if (!isValidDate(src.loan_date)) errors.push("loan_date harus berformat YYYY-MM-DD");
    else payload.loan_date = src.loan_date;
  } else if (!partial) {
    payload.loan_date = t;
  }

  if (src.due_date === undefined) {
    if (!partial) errors.push("due_date wajib diisi");
  } else if (!isValidDate(src.due_date)) {
    errors.push("due_date harus berformat YYYY-MM-DD");
  } else {
    payload.due_date = src.due_date;
  }

  if (src.return_date !== undefined) {
    if (src.return_date === null) payload.return_date = null;
    else if (!isValidDate(src.return_date)) errors.push("return_date harus berformat YYYY-MM-DD atau null");
    else payload.return_date = src.return_date;
  }

  if (src.status !== undefined) {
    if (src.status === "Terlambat") {
      errors.push("status 'Terlambat' dihitung otomatis dari due_date, tidak bisa diisi manual");
    } else if (!STATUS_VALUES.includes(src.status)) {
      errors.push(`status harus salah satu dari: ${STATUS_VALUES.join(", ")}`);
    } else {
      payload.status = src.status;
    }
  }

  if (errors.length) return { errors, payload };

  // Jaga konsistensi status dan return_date
  if (payload.status === "Dikembalikan" && payload.return_date === undefined) payload.return_date = t;
  if (payload.status === "Dipinjam" && payload.return_date === undefined) payload.return_date = null;
  if (payload.status === undefined && payload.return_date) payload.status = "Dikembalikan";
  if (payload.status === undefined && payload.return_date === null) payload.status = "Dipinjam";
  if (payload.status === "Dipinjam" && payload.return_date) {
    errors.push("return_date tidak boleh diisi jika status Dipinjam");
  }
  if (payload.status === "Dikembalikan" && payload.return_date === null) {
    errors.push("return_date wajib diisi jika status Dikembalikan");
  }

  if (payload.loan_date && payload.due_date && payload.due_date < payload.loan_date) {
    errors.push("due_date tidak boleh lebih awal dari loan_date");
  }
  if (payload.loan_date && payload.return_date && payload.return_date < payload.loan_date) {
    errors.push("return_date tidak boleh lebih awal dari loan_date");
  }

  if (!partial && payload.status === undefined) payload.status = "Dipinjam";
  if (partial && Object.keys(payload).length === 0) {
    errors.push("Tidak ada field valid yang dikirim untuk diperbarui");
  }

  return { errors, payload };
};

const sendError = (res, err) => {
  console.error(err);
  const known = {
    "22P02": [400, "Format ID tidak valid (harus berupa UUID)"],
    "23514": [400, "Data melanggar aturan database (mis. due_date lebih awal dari loan_date)"],
    "23505": [409, "Data duplikat"],
  };
  const [status, message] = known[err.code] ?? [500, err.message || "Terjadi kesalahan pada server"];
  return res.status(status).json({ success: false, message });
};

const notFound = (res, id) =>
  res.status(404).json({ success: false, message: `Data peminjaman dengan id ${id} tidak ditemukan` });

export const LoanController = {
  async getAll(req, res) {
    try {
      const filters = {
        member_number: asString(req.query.member_number),
        q: asString(req.query.q),
      };

      if (req.query.status !== undefined) {
        const status = STATUS_FILTERS.find(
          (s) => s.toLowerCase() === String(req.query.status).trim().toLowerCase()
        );
        if (!status) {
          return res.status(400).json({
            success: false,
            message: `Filter status tidak valid. Gunakan: ${STATUS_FILTERS.join(", ")}`,
          });
        }
        filters.status = status;
      }

      const loans = await LoanModel.getAll(filters);
      res.json({ success: true, count: loans.length, data: loans });
    } catch (err) {
      sendError(res, err);
    }
  },

  async getById(req, res) {
    try {
      const loan = await LoanModel.getById(req.params.id);
      if (!loan) return notFound(res, req.params.id);
      res.json({ success: true, data: loan });
    } catch (err) {
      sendError(res, err);
    }
  },

  async create(req, res) {
    try {
      const { errors, payload } = validateLoan(req.body);
      if (errors.length) {
        return res.status(400).json({ success: false, message: "Validasi gagal", errors });
      }
      const loan = await LoanModel.create(payload);
      res.status(201).json({ success: true, message: "Data peminjaman berhasil ditambahkan", data: loan });
    } catch (err) {
      sendError(res, err);
    }
  },

  async update(req, res) {
    try {
      const { errors, payload } = validateLoan(req.body, { partial: true });
      if (errors.length) {
        return res.status(400).json({ success: false, message: "Validasi gagal", errors });
      }
      const loan = await LoanModel.update(req.params.id, payload);
      if (!loan) return notFound(res, req.params.id);
      res.json({ success: true, message: "Data peminjaman berhasil diperbarui", data: loan });
    } catch (err) {
      sendError(res, err);
    }
  },

  async remove(req, res) {
    try {
      const deleted = await LoanModel.remove(req.params.id);
      if (!deleted) return notFound(res, req.params.id);
      res.json({ success: true, message: "Data peminjaman berhasil dihapus" });
    } catch (err) {
      sendError(res, err);
    }
  },
};