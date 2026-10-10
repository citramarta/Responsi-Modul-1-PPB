import { supabase } from "../config/supabaseClient.js";

const TABLE = "loans";

// Tanggal hari ini (YYYY-MM-DD) dalam zona waktu WIB.
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

// Status "Terlambat" tidak disimpan di database, tetapi dihitung dari
// kombinasi status "Dipinjam" dan due_date yang sudah lewat.
const withStatus = (loan) => {
  if (!loan) return loan;
  const late = loan.status === "Dipinjam" && loan.due_date < today();
  return { ...loan, status: late ? "Terlambat" : loan.status };
};

export const LoanModel = {
  async getAll({ status, member_number, q } = {}) {
    let query = supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (status === "Terlambat") {
      query = query.eq("status", "Dipinjam").lt("due_date", today());
    } else if (status === "Dipinjam") {
      query = query.eq("status", "Dipinjam").gte("due_date", today());
    } else if (status === "Dikembalikan") {
      query = query.eq("status", "Dikembalikan");
    }

    if (member_number) query = query.eq("member_number", member_number);

    if (q) {
      // Karakter khusus dibuang agar tidak merusak sintaks filter .or()
      const keyword = q.replace(/[,()%*]/g, "");
      if (keyword) {
        query = query.or(
          `member_name.ilike.%${keyword}%,book_title.ilike.%${keyword}%`
        );
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data.map(withStatus);
  },

  async getById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return withStatus(data);
  },

  async create(payload) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return withStatus(data);
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return withStatus(data);
  },

  async remove(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data; // null jika data tidak ditemukan
  },
};