// main.js

// --- CONFIG SUPABASE (WAJIB DIISI) ---
// Masukkan URL dan ANON KEY dari Dashboard Supabase Anda
const SUPABASE_URL = "https://sscuoketauxthoxujrnp.supabase.co";
const SUPABASE_KEY = "sb_publishable_48Q1kSRbcarAwpGHNsFZGg_Pu07R2mX";

// Cek apakah library Supabase termuat
if (typeof supabase === "undefined") {
  alert("Library Supabase gagal dimuat! Cek koneksi internet.");
}

// Inisialisasi Client
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const audioInput = document.getElementById("audioInput");
const loadingArea = document.getElementById("loadingArea");
const resultArea = document.getElementById("resultArea");
const compAudio = document.getElementById("compAudio");
const fileNameTxt = document.getElementById("fileName");

const inputJudul = document.getElementById("inputJudul");
const inputArtist = document.getElementById("inputArtist");
const inputImage = document.getElementById("inputImage");
const uploadBtn = document.getElementById("uploadBtn");

// Variabel Global untuk menyimpan hasil kompresi sementara
let finalCompressedBlob = null;

// Fitur tambahan: Update teks saat gambar dipilih
inputImage.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    document.getElementById("imageName").textContent = "File: " + file.name;
  }
});

// EVENT 1: SAAT FILE AUDIO DIPILIH
audioInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Reset UI
  fileNameTxt.textContent = file.name;
  loadingArea.classList.remove("hidden");
  resultArea.classList.add("hidden");
  inputJudul.value = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "); // Auto isi judul

  try {
    // Tampilkan size asli
    document.getElementById("origSize").textContent = (
      file.size /
      1024 /
      1024
    ).toFixed(2);

    // Beri waktu browser render loading UI
    setTimeout(async () => {
      // Panggil fungsi dari compressor.js
      const blob = await compressAudioManual(file);
      finalCompressedBlob = blob;

      // Update UI Hasil
      document.getElementById("compSize").textContent = (
        blob.size /
        1024 /
        1024
      ).toFixed(2);
      compAudio.src = URL.createObjectURL(blob);

      loadingArea.classList.add("hidden");
      resultArea.classList.remove("hidden");
    }, 100);
  } catch (err) {
    console.error(err);
    alert("Gagal proses audio: " + err.message);
    loadingArea.classList.add("hidden");
  }
});

// EVENT 2: SAAT TOMBOL UPLOAD DIKLIK
uploadBtn.addEventListener("click", async () => {
  // Validasi
  if (!finalCompressedBlob) return alert("Audio belum siap!");
  if (!inputJudul.value || !inputArtist.value)
    return alert("Lengkapi judul & artis!");
  if (!inputImage.files[0]) return alert("Pilih gambar cover!");

  // Matikan tombol
  uploadBtn.disabled = true;
  uploadBtn.textContent = "Sedang Mengupload...";

  try {
    const timestamp = new Date().getTime();

    // A. Upload Audio (.wav)
    const audioName = `song_${timestamp}.wav`;
    const {error: errAudio} = await sbClient.storage
      .from("music") // Pastikan bucket 'music' ada di Supabase
      .upload(audioName, finalCompressedBlob);

    if (errAudio) throw new Error("Gagal upload Audio: " + errAudio.message);
    const {data: urlAudio} = sbClient.storage
      .from("music")
      .getPublicUrl(audioName);

    // B. Upload Gambar
    const imgFile = inputImage.files[0];
    const imgExt = imgFile.name.split(".").pop();
    const imgName = `cover_${timestamp}.${imgExt}`;
    const {error: errImg} = await sbClient.storage
      .from("images") // Pastikan bucket 'images' ada di Supabase
      .upload(imgName, imgFile);

    if (errImg) throw new Error("Gagal upload Gambar: " + errImg.message);
    const {data: urlImg} = sbClient.storage
      .from("images")
      .getPublicUrl(imgName);

    // C. Simpan ke Database
    const {error: errDB} = await sbClient
      .from("songs") // Pastikan tabel 'songs' ada
      .insert([
        {
          judul: inputJudul.value,
          artist: inputArtist.value,
          song_url: urlAudio.publicUrl,
          cover_url: urlImg.publicUrl,
        },
      ]);

    if (errDB) throw new Error("Gagal simpan DB: " + errDB.message);

    alert("✅ SUKSES! Lagu berhasil disimpan.");
    location.reload();
  } catch (error) {
    console.error(error);
    alert("❌ Error: " + error.message);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "☁️ Upload ke Database";
  }
});
