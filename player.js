// player.js

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
const songGrid = document.getElementById('songGrid');
const loadingText = document.getElementById('loadingText');

// Player Elements
const stickyPlayer = document.getElementById('stickyPlayer');
const mainAudio = document.getElementById('mainAudio');
const playerImg = document.getElementById('playerImg');
const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');

// 1. FUNGSI UNTUK MENGAMBIL DATA LAGU
async function fetchSongs() {
    try {
        // Select semua kolom dari tabel 'songs', urutkan dari yang terbaru
        const { data: songs, error } = await sbClient
            .from('songs')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        // Hilangkan loading
        loadingText.style.display = 'none';

        // Render ke HTML
        renderSongs(songs);

    } catch (err) {
        console.error(err);
        loadingText.textContent = "Gagal memuat lagu: " + err.message;
    }
}

// 2. FUNGSI UNTUK MENAMPILKAN KARTU LAGU (RENDER)
function renderSongs(songs) {
    if (songs.length === 0) {
        songGrid.innerHTML = "<p>Belum ada lagu yang diupload.</p>";
        return;
    }

    songGrid.innerHTML = ''; // Kosongkan grid

    songs.forEach(song => {
        // Buat elemen HTML Card
        const card = document.createElement('div');
        card.className = 'song-card';
        
        // Isi Card
        card.innerHTML = `
            <img src="${song.cover_url}" alt="${song.judul}">
            <div class="card-info">
                <h3>${song.judul}</h3>
                <p>${song.artist}</p>
            </div>
            <button class="play-btn">▶ Putar</button>
        `;

        // Event Klik (Untuk Memutar Lagu)
        card.addEventListener('click', () => {
            playSong(song);
        });

        songGrid.appendChild(card);
    });
}

// 3. FUNGSI MEMUTAR AUDIO
function playSong(song) {
    // Munculkan player bawah
    stickyPlayer.classList.remove('hidden');

    // Set data ke player
    mainAudio.src = song.song_url;
    playerTitle.textContent = song.judul;
    playerArtist.textContent = song.artist;
    playerImg.src = song.cover_url;

    // Putar otomatis
    mainAudio.play();
}

// Jalankan saat halaman dibuka
fetchSongs();