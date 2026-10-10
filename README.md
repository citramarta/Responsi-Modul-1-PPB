**Library Loan API**
REST API sederhana untuk layanan pencatatan peminjaman buku perpustakaan menggunakan Node.js, Express.js, dan Supabase (PostgreSQL), dan di-deploy ke Vercel.

**Deskripsi Umum**: library loan API adalah sistem untuk mencatat dan mengelola data peminjaman buku oleh anggota perpustakaan. Melalui API ini, petugas dapat menambah data peminjaman, melihat daftar peminjaman, memperbarui data (misalnya mencatat pengembalian buku), dan menghapus data peminjaman.
**Tujuan proyek**:
- Menerapkan arsitektur RESTful API dengan operasi CRUD (Create, Read, Update, Delete).
- Menghubungkan Express.js dengan Supabase sebagai backend-as-a-service.
- Memisahkan logika aplikasi ke dalam model, controller, dan routes.
- Menyediakan fitur filter query.
- Menggunakan variabel lingkungan (.env) dan men-deploy ke vercel supaya dapat diakses public.

**Fitur**
- CRUD data peminjaman buku.
- Filter berdasarkan status, member_number, dan pencarian kata kunci (nama anggota atau judul buku).
- Status "Terlambat" dihitung otomatis: peminjaman berstatus "Dipinjam" yang due_date nya sudah lewat.
- Validasi input dan format respons JSON yang konsisten.

**Tech Stack**
| Komponen   | Teknologi             |
| ---------- | --------------------- |
| Runtime    | Node.js               |
| Framework  | Express.js            |
| Database   | Supabase (PostgreSQL) |
| Deployment | Vercel                |
| Pengujian  | Postman               |

**Struktur Folder**
perpustakaan_citra_responsi/
├── src/
│   ├── config/
│   │   └── supabaseClient.js   
│   ├── models/
│   │   └── loanModel.js        
│   ├── controllers/
│   │   └── loanController.js   
│   ├── routes/
│   │   └── loanRoutes.js       
│   └── index.js                
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md

**Struktur Data/Schema**
Tabel loans:
| Kolom         | Tipe        | Keterangan                                           |
| ------------- | ----------- | ---------------------------------------------------- |
| id            | uuid (PK)   | Dibuat otomatis oleh database                        |
| member_name   | text        | Nama anggota peminjam (wajib)                        |
| member_number | text        | Nomor anggota (wajib)                                |
| book_title    | text        | Judul buku yang dipinjam (wajib)                     |
| loan_date     | date        | Tanggal peminjaman, default hari ini                 |
| due_date      | date        | Batas pengembalian (wajib)                           |
| return_date   | date        | Tanggal pengembalian, null jika belum dikembalikan   |
| status        | text        | Dipinjam atau Dikembalikan (default Dipinjam)  	     |
| created_at    | timestamptz | Waktu data dibuat                                    |

Catatan: database hanya menyimpan "Dipinjam" dan "Dikembalikan". Pada respons API, peminjaman berstatus "Dipinjam" yang due_date nya sudah lewat ditampilkan sebagai "Terlambat" yang dihitung otomatis dan tidak dapat diisi manual.

**Skema SQL** untuk membuat tabel:
CREATE TABLE loans (  
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_name VARCHAR(100) NOT NULL,
    member_number VARCHAR(30) NOT NULL,
    book_title VARCHAR(200) NOT NULL,
    loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Dipinjam'
        CHECK (status IN ('Dipinjam', 'Dikembalikan', 'Terlambat')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

**Daftar Endpoint**
| Method      | Endpoint   | Deskripsi                                  |
| ----------- | ---------- | ------------------------------------------ |
| GET         | /          | Cek status API                             |
| GET         | /loans     | Ambil semua peminjaman (mendukung filter)  |
| GET         | /loans/:id | Ambil satu peminjaman berdasarkan ID       |
| POST        | /loans     | Tambah peminjaman baru                     |
| PUT/PATCH   | /loans/:id | Perbarui peminjaman (boleh sebagian field) |
| DELETE      | /loans/:id | Hapus peminjaman                           |

**Filter Query** pada GET http://localhost:3000/loans
| Parameter     | Contoh                       | Keterangan                                     |
| ------------- | ---------------------------- | ---------------------------------------------- |
| status        | /loans?status=Terlambat      | `Dipinjam`, `Dikembalikan`, atau `Terlambat`   |
| member_number | /loans?member_number=AGT-001 | Peminjaman milik anggota tertentu              |
| q             | /loans?q=laskar              | Cari pada nama anggota atau judul buku         |

Filter dapat dikombinasikan, misalnya /loans?status=Terlambat&member_number=AGT-001.

**Contoh Request & Response**
**1. Tambah peminjaman**: POST http://localhost:3000/loans/
**Request**
{
  "member_name": "Citra Maharani",
  "member_number": "AGT-001",
  "book_title": "Laskar Pelangi",
  "due_date": "2026-10-24"
}

**Response (201 Created)**
{
    "success": true,
    "message": "Data peminjaman berhasil ditambahkan",
    "data": {
        "id": "83a7ad7b-3224-49ea-b3d8-16cb06b9347c",
        "member_name": "Citra Maharani",
        "member_number": "AGT-001",
        "book_title": "Laskar Pelangi",
        "loan_date": "2026-10-10",
        "due_date": "2026-10-24",
        "return_date": null,
        "status": "Dipinjam",
        "created_at": "2026-10-10T07:12:14.272351+00:00"
    }
}

**2. Ambil semua peminjaman**: GET http://localhost:3000/loans/
**Response (200 OK)**
{
    "success": true,
    "count": 1,
    "data": [
        {
            "id": "83a7ad7b-3224-49ea-b3d8-16cb06b9347c",
            "member_name": "Citra Maharani",
            "member_number": "AGT-001",
            "book_title": "Laskar Pelangi",
            "loan_date": "2026-10-10",
            "due_date": "2026-10-24",
            "return_date": null,
            "status": "Dipinjam",
            "created_at": "2026-10-10T07:12:14.272351+00:00"
        }
    ]
}

**3. Filter peminjaman terlambat**: GET http://localhost:3000/loans?status=Terlambat
**Response (200 OK)**
{
    "success": true,
    "count": 1,
    "data": [
        {
            "id": "2c9d8c12-67c4-4da0-b2f0-f5ccae2a51a5",
            "member_name": "Andi Pratama",
            "member_number": "AGT-004",
            "book_title": "Laut Bercerita",
            "loan_date": "2026-10-01",
            "due_date": "2026-10-09",
            "return_date": null,
            "status": "Terlambat",
            "created_at": "2026-10-10T07:25:52.546877+00:00"
        }
    ]
}

**4. Ambil satu peminjaman**: GET http://localhost:3000/loans/4727da7e-5efb-43b3-89f9-150970311d0b
**Response (200 OK):**
{
    "success": true,
    "data": {
        "id": "4727da7e-5efb-43b3-89f9-150970311d0b",
        "member_name": "Budi Santoso",
        "member_number": "AGT-001",
        "book_title": "Clean Code",
        "loan_date": "2026-10-10",
        "due_date": "2026-10-24",
        "return_date": null,
        "status": "Dipinjam",
        "created_at": "2026-10-10T07:20:52.89652+00:00"
    }
}

**5. Catat pengembalian buku**: PUT http://localhost:3000/loans/4727da7e-5efb-43b3-89f9-150970311d0b
Mengubah "status" menjadi "Dikembalikan" akan mengisi "return_date" otomatis dengan tanggal hari ini.
**Request:**
{
  "status": "Dikembalikan"
}

**Response (200 OK):**
{
    "success": true,
    "message": "Data peminjaman berhasil diperbarui",
    "data": {
        "id": "4727da7e-5efb-43b3-89f9-150970311d0b",
        "member_name": "Budi Santoso",
        "member_number": "AGT-001",
        "book_title": "Clean Code",
        "loan_date": "2026-10-10",
        "due_date": "2026-10-24",
        "return_date": "2026-10-10",
        "status": "Dikembalikan",
        "created_at": "2026-10-10T07:20:52.89652+00:00"
    }
}

**6. Hapus peminjaman**: DELETE http://localhost:3000/loans/83a7ad7b-3224-49ea-b3d8-16cb06b9347c
**Response (200 OK):**
{
    "success": true,
    "message": "Data peminjaman berhasil dihapus"
}

**Panduan Instalasi & Menjalankan Lokal**
Yang diperlukan: vs code, node.js, supabase, postman (untuk pengujian), web browser, command prompt. 

**1. Clone repository**
git clone https://github.com/<username>/<nama-repository>.git
cd <nama-repository>
**2. Install dependensi**
npm install
**3. Buat database Supabase**
a. Buat proyek baru di Supabase.
b. Buka SQL Editor lalu klik New query, masukkan skema SQL pada bagian, lalu klik Run.
c. Ambil kredensial dari **Project Settings**: **Project URL** (menu *Data API*) dan anon public key (menu API Keys).
**4. Konfigurasi env**
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co (isi sesuai di supabase)
SUPABASE_KEY=isi sesuai di supabase
PORT=3000 
**5. Jalankan server**
lalu jalankan dengan npm run dev 
Jika berhasil, terminal menampilkan "Server running on port 3000". Buka "http://localhost:3000/loans" untuk menguji.

**Deployment ke Vercel:**
1. Unggah proyek ke repository GitHub.
2. Login ke vercel, klik Add New... lalu Project, lalu Import repository ini.
3. Pada bagian Environment Variables, tambahkan SUPABASE_URL dan SUPABASE_KEY.
4. Klik Deploy dan tunggu proses build selesai.
5. Uji endpoint menggunakan URL publik yang diberikan Vercel.

**Link Hasil Deployment**
URL: https://<nama-project>.vercel.app
