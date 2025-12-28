// compressor.js
// Logika untuk mengubah byte audio secara manual

async function compressAudioManual(file) {
    // 1. Baca Audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 2. Setting Kualitas (Makin besar angka, makin kecil file, makin jelek suara)
    // Coba ganti angka ini: 2, 4, atau 6
    const compressionRatio = 4; 

    // 3. Proses Data (Stereo -> Mono & Downsampling)
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

    const newLength = Math.floor(leftChannel.length / compressionRatio);
    const compressedData = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
        const originalIndex = i * compressionRatio; //Down Sampling 
        // Rata-rata channel kiri & kanan
        const avgSignal = (leftChannel[originalIndex] + rightChannel[originalIndex]) / 2; //Mixing
        compressedData[i] = avgSignal;
    }

    // 4. Encode kembali ke WAV
    const newSampleRate = audioBuffer.sampleRate / compressionRatio;
    return encodeWAV(compressedData, newSampleRate);
}


// Fungsi Helper: Membungkus data audio mentah menjadi file WAV standar
function encodeWAV(samples, sampleRate) {
    
    // 1. ALOKASI MEMORI (Mirip malloc di C)
    // Kita memesan wadah kosong di RAM. Ukurannya adalah:
    // - 44 Byte: Untuk Header (KTP/Identitas file WAV standar)
    // - samples.length * 2: Untuk Data Suara. Dikali 2 karena kita pakai 16-bit (2 byte per sampel).
    const buffer = new ArrayBuffer(44 + samples.length * 2);

    // 2. AKSES MEMORI (Mirip Pointer)
    // DataView adalah alat untuk menulis angka biner ke alamat memori (buffer) tadi.
    const view = new DataView(buffer);

    /* --- MULAI MENULIS HEADER RIFF (CONTAINER) --- */

    // [Byte 0-3] Menulis string 'RIFF'. Tanda tangan format file multimedia.
    writeString(view, 0, 'RIFF');

    // [Byte 4-7] Menulis Ukuran File (Total file - 8 byte pertama). 
    // Menggunakan Uint32 (4 byte) karena angkanya bisa besar. 'true' = Little Endian.
    view.setUint32(4, 36 + samples.length * 2, true);

    // [Byte 8-11] Menulis string 'WAVE'. Menandakan ini spesifik file audio WAVE.
    writeString(view, 8, 'WAVE');

    /* --- MULAI MENULIS CHUNK "fmt" (FORMAT AUDIO) --- */

    // [Byte 12-15] Menulis string 'fmt ' (pakai spasi di akhir). Penanda mulai info format.
    writeString(view, 12, 'fmt ');

    // [Byte 16-19] Ukuran Chunk fmt. Untuk PCM standar, ukurannya selalu 16 byte.
    view.setUint32(16, 16, true);

    // [Byte 20-21] Audio Format. Angka 1 artinya PCM (Raw/Tanpa Kompresi).
    // Pakai Uint16 (2 byte) karena kodenya cuma angka kecil.
    view.setUint16(20, 1, true); 

    // [Byte 22-23] Jumlah Channel. Kita tulis 1 karena Mono (hasil gabungan L+R).
    view.setUint16(22, 1, true); 

    // [Byte 24-27] Sample Rate (misal 11025 Hz). Kecepatan pemutaran suara.
    view.setUint32(24, sampleRate, true);

    // [Byte 28-31] Byte Rate. Rumus: SampleRate * NumChannels * BytesPerSample.
    // Ini memberi tahu player berapa byte yang harus diproses per detik.
    view.setUint32(28, sampleRate * 2, true);

    // [Byte 32-33] Block Align. Ukuran satu frame data (1 channel * 2 byte).
    view.setUint16(32, 2, true);

    // [Byte 34-35] Bit Depth. Kita tulis 16, artinya kualitas 16-bit (standar CD).
    view.setUint16(34, 16, true); 

    /* --- MULAI MENULIS CHUNK "data" (ISI SUARA) --- */

    // [Byte 36-39] Menulis string 'data'. Penanda bahwa header selesai, saatnya data asli.
    writeString(view, 36, 'data');

    // [Byte 40-43] Ukuran Data Audio saja (Total byte pasir suara).
    view.setUint32(40, samples.length * 2, true);

    /* --- PENGISIAN DATA (PAYLOAD) --- */

    // Fungsi helper lain untuk mengonversi Float (-1.0 s/d 1.0) menjadi Int16
    // dan menulisnya ke buffer mulai dari offset (posisi) ke-44.
    floatTo16BitPCM(view, 44, samples);

    /* --- PACKAGING --- */

    // Membungkus Buffer (Memori RAM) menjadi Blob (File Virtual).
    // Blob inilah yang nanti dianggap browser sebagai file "lagu.wav".
    return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output, offset, input) {
    // Loop: Jalan menelusuri setiap sample suara di input
    // i++      : Geser 1 langkah di array input (data suara)
    // offset+=2: Geser 2 langkah di memori output (karena 16-bit = 2 byte)
    for (let i = 0; i < input.length; i++, offset += 2) {
        
        // 1. CLAMPING (Penjepitan Nilai)
        // Kadang hasil matematika audio menghasilkan angka 1.00001 atau -1.2.
        // Jika angka itu dikonversi, suaranya akan 'glitch' parah.
        // Kode ini memaksa angka tetap di antara -1 dan 1.
        let s = Math.max(-1, Math.min(1, input[i]));

        // 2. SCALING (Konversi Desimal ke Integer)
        // Mengalikan pecahan dengan nilai maksimum 16-bit.
        // Jika negatif (< 0): dikali 32768 (0x8000)
        // Jika positif (>= 0): dikali 32767 (0x7FFF)
        // Kenapa beda? Karena range integer 16-bit adalah -32768 sampai 32767.
        // Kalau positif dikali 32768, dia akan "overflow" (mental jadi negatif).
        s = s < 0 ? s * 0x8000 : s * 0x7FFF;

        // 3. PENULISAN KE MEMORI
        // Menulis angka integer tersebut ke alamat memori 'offset'.
        // 'true' artinya Little Endian (byte terbalik).
        output.setInt16(offset, s, true);
    }
}

function writeString(view, offset, string) {
    // Loop: Jalan sebanyak jumlah huruf dalam string
    for (let i = 0; i < string.length; i++) {
        
        // 1. AMBIL KODE ASCII & TULIS
        // string.charCodeAt(i) : Mengambil kode angka dari huruf. 
        // Contoh: Huruf 'R' kode ASCII-nya adalah 82.
        // view.setUint8(...)  : Menulis angka 82 itu ke memori.
        // offset + i          : Menulis berurutan (R di 0, I di 1, F di 2...)
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}