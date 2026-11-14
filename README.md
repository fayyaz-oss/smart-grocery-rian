# Smart Grocery & Budget Safety Tracker (PWA)

Aplikasi web Progressive Web App (PWA) cerdas yang dirancang khusus dengan tampilan **Mobile UI modern** untuk mempermudah mencatat belanjaan, menghitung diskon bertingkat (misal: 50% + 20%), membandingkan riwayat harga antar toko secara realtime, dan memantau batas anggaran (Safety Cap) agar terhindar dari *overbudget*.

Aplikasi terhubung langsung ke **Cloud Firestore secara Realtime** dengan fallback otomatis ke **LocalStorage** jika perangkat sedang offline.

---

## 🌟 Fitur Utama

### 1. Daftar Belanja & Subtotal Otomatis (F-01 & F-02)
- Input lengkap: **Nama barang**, **Lokasi Toko** (dilengkapi quick chips: Superindo, Indomaret, Alfamart, Pasar Modern), **Kategori**, **Kuantitas & Satuan** (pcs, kg, liter, pack, botol, dll.), dan **Harga Satuan Normal**.
- Perhitungan **Subtotal Otomatis** untuk setiap item berdasarkan kuantitas & harga efektif setelah diskon.
- Kalkulasi total belanja keseluruhan secara realtime.
- Checklist status beli (bisa dicentang untuk menandai barang yang sudah masuk ke keranjang belanja riil).
- Fitur Edit dan Hapus belanjaan.
- Filter tab: *Semua*, *Belum Dibeli*, *Sudah Dibeli*, serta pencarian cepat dan pengurutan (Terbaru, Harga Tertinggi/Terendah, Nama).

### 2. Kalkulator Diskon Bertingkat (F-03)
- Mendukung diskon ganda beruntun supermarket/hypermarket (contoh: **50% + 20%** atau **70% + 10%**).
- Rumus kalkulasi:
  - *Tahap 1*: $H_1 = \text{Harga Asli} \times (1 - D_1/100)$
  - *Tahap 2*: $H_{\text{akhir}} = H_1 \times (1 - D_2/100)$
- Menampilkan nominal penghematan uang (rupiah) dan persentase diskon efektif secara transparan.
- Dilengkapi **Preset Diskon Cepat**: `10%`, `20%`, `30%`, `50%+20%`, `70%`.
- **Fitur Khusus: Kalkulator Diskon Cepat (Standalone Modal)**:
  - Tombol persentase (`%`) di header memungkinkan Anda mengecek diskon barang di lorong toko secara instan tanpa harus menambahkannya ke daftar belanja.

### 3. Komparator Harga Riwayat Toko (F-04)
- Secara otomatis mencatat riwayat harga setiap barang di berbagai toko ke dalam database.
- Saat Anda mengetik barang dan harga di toko tertentu:
  - Sistem langsung mengecek riwayat harga sebelumnya dari toko lain.
  - Memberikan indikator komparasi:
    - 🔻 **Panah Hijau**: Harga lebih murah/turun dibanding toko sebelumnya.
    - 🔺 **Panah Merah**: Harga lebih mahal/naik dibanding toko sebelumnya.
    - ⏺️ **Garis Abu-abu**: Harga stabil / sama dengan toko sebelumnya.
    - 🆕 **Toko Pertama**: Data pertama untuk barang ini.
- **Modal Riwayat Komparator Toko**:
  - Tombol grafik di header menampilkan rangkuman perbandingan harga seluruh barang antar toko dan menandai toko mana yang memiliki harga **TERMURAH**.

### 4. Safety Cap / Limit Dompet (F-05)
- Kartu pemantau anggaran interaktif dengan **batas default Rp 400.000** (dapat diubah kapan saja oleh pengguna melalui modal pengaturan atau klik tombol pensil).
- **Progress Bar Dinamis & Indikator Warna**:
  - 🟢 **Aman (< 75%)**: Warna hijau emerald dengan status belanja aman.
  - 🟡 **Mendekati Batas (75% - 99.9%)**: Warna kuning/oranye dengan peringatan sisa saldo.
  - 🔴 **BAHAYA / OVERBUDGET (≥ 100%)**: Warna merah berdenyut dengan alarm visual bahwa anggaran telah terlampaui.
- Menampilkan: Total Belanja, Sisa Saldo (atau Defisit), Persentase Terpakai, dan Total Penghematan dari Diskon.

### 5. Integrasi Firebase Cloud Firestore Realtime & Offline Resilience
- Menggunakan **Firebase Modular SDK (v10)** via CDN.
- Menyimpan data belanja ke koleksi Firestore `"groceries"`.
- Sinkronisasi realtime menggunakan **`onSnapshot`**: setiap penambahan, edit, atau hapus item langsung terupdate otomatis di layar tanpa reload halaman.
- **Fallback ke LocalStorage**:
  - Jika internet terputus atau offline, aplikasi otomatis beralih ke LocalStorage sehingga proses input belanjaan tidak pernah macet.
  - Begitu koneksi aktif kembali, status banner akan berubah hijau secara otomatis.

### 6. Kemampuan Progressive Web App (PWA)
- File `manifest.json`, `sw.js` (Service Worker), `icon-192.png`, `icon-512.png`, dan `icon.svg`.
- Aplikasi dapat di-install langsung ke layar utama (*Add to Home Screen*) pada smartphone Android (Chrome) dan iOS (Safari) untuk pengalaman seperti aplikasi native.

---

## 📁 Struktur File

```text
smart grocery rian/
├── index.html        # Struktur HTML5 Mobile UI, modal, filter, dan integrasi Firebase CDN
├── style.css         # Styling modern Mobile-First, dark slate glassmorphism, animasi & badge
├── script.js         # Logika Firebase Realtime, LocalStorage, kalkulator diskon, komparator toko & safety cap
├── manifest.json     # Konfigurasi PWA (nama, tema, ikon, standalone display)
├── sw.js             # Service Worker untuk caching app shell & offline support
├── icon.svg          # Ikon vektor aplikasi
├── icon-192.png      # Ikon resolusi 192x192 untuk PWA
├── icon-512.png      # Ikon resolusi 512x512 untuk splash screen PWA
└── README.md         # Dokumentasi lengkap
```

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi dibangun murni menggunakan standar web modern (HTML, CSS, JavaScript ES Modules). Karena menggunakan Firebase CDN ES Module dan fitur PWA Service Worker, cara terbaik untuk menjalankannya adalah melalui web server lokal atau hosting:

### Cara 1: Menggunakan VS Code Live Server (Direkomendasikan)
1. Buka folder `smart grocery rian` di VS Code.
2. Klik kanan pada file `index.html` dan pilih **"Open with Live Server"**.
3. Aplikasi akan terbuka di browser pada URL `http://127.0.0.1:5500/index.html`.

### Cara 2: Menggunakan Terminal / Node (npx)
Jalankan perintah berikut di folder proyek:
```bash
npx serve .
```
Lalu buka alamat yang tertera (biasanya `http://localhost:3000`).

### Cara 3: Menggunakan Python
```bash
python -m http.server 8080
```
Buka browser pada `http://localhost:8080`.

### Cara 4: Deploy Langsung ke Hosting Gratis (Firebase / Netlify / Vercel / GitHub Pages)
Anda dapat meng-upload file proyek ini ke Firebase Hosting, Netlify, atau GitHub Pages untuk digunakan langsung di handphone siapa pun secara online!

