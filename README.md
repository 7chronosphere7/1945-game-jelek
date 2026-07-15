# Sky Assault: Operation Thunder

Sky Assault: Operation Thunder adalah sebuah proyek game vertical-scrolling shoot'em up (Shmup) militer futuristik berkualitas tinggi yang dirancang menggunakan Unity 6 LTS. Proyek ini mengimplementasikan clean architecture, SOLID principles, optimalisasi object pooling, dan sistem data berbasis ScriptableObjects.

---

## 🛠️ Persyaratan Sistem & Dependensi

*   **Game Engine**: Unity 6 LTS (versi minimal: `6000.0.0f1`)
*   **Render Pipeline**: Universal Render Pipeline (URP)
*   **Paket Wajib** (Sudah dikonfigurasi di `Packages/manifest.json`):
    *   `Universal RP` (URP)
    *   `New Input System`
    *   `Cinemachine`
    *   `TextMeshPro`
    *   `2D Animation`

---

## 📁 Struktur Folder Proyek

Proyek ini terstruktur secara rapi sesuai dengan panduan pengembangan game profesional:

```
SkyAssault/
├── Assets/
│   ├── Art/               # Tekstur sprite pesawat, latar belakang parallax, ikon UI
│   ├── Audio/             # Musik latar (BGM) dan sound effect (SFX)
│   ├── Fonts/             # Font kustom TextMeshPro
│   ├── Prefabs/           # Prefab peluru, pemain, musuh, dan efek partikel
│   ├── Scenes/            # Semua scene alur permainan (Bootstrap, Main Menu, Level, dll.)
│   └── Scripts/           # Arsitektur kode C# modular
│       ├── Core/          # Save system, audio, input, pooling, dan game managers
│       ├── Player/        # Logika controller pesawat pemain
│       ├── Enemy/         # Logika AI musuh dan Boss bertingkat
│       ├── Weapons/       # Peluru dan penyebaran pola tembakan
│       └── UI/            # Pengendalian tampilan HUD dan transisi menu
├── Packages/
│   └── manifest.json      # Manifest dependensi paket Unity
└── ProjectSettings/
    ├── ProjectVersion.txt # Konfigurasi versi Unity Editor
    └── TagManager.asset   # Konfigurasi Layer fisik (Player, Enemy, Bullet, dll.)
```

---

## 🚀 Cara Membuka Proyek di Unity 6 LTS

1.  Buka **Unity Hub**.
2.  Klik tombol **Add** -> **Add project from disk**.
3.  Pilih folder `d:\BALI AI\1945\`.
4.  Hub secara otomatis mendeteksi konfigurasi editor Unity 6. Klik pada nama proyek untuk membukanya.
5.  Saat pertama kali dibuka, Unity akan mengunduh paket dependensi yang tercantum di `manifest.json` secara otomatis.

---

## 🏗️ Cara Melakukan Build Game

### Build untuk Windows (.exe)
1.  Buka menu **File** -> **Build Settings**.
2.  Pilih platform **Dedicated Server** atau **Windows** (pilih **PC, Mac & Linux Standalone**).
3.  Pastikan **Target Platform** diatur ke **Windows** dan **Architecture** ke **x86_64**.
4.  Masukkan semua Scene dari folder `Assets/Scenes/` ke dalam daftar **Scenes In Build** sesuai dengan urutan alur (dimulai dari `Bootstrap` atau `MainMenu`).
5.  Klik tombol **Build**, lalu pilih folder target keluaran.

### Build untuk Android
1.  Buka **File** -> **Build Settings**.
2.  Pilih platform **Android** dan klik **Switch Platform**.
3.  Pastikan SDK Android dan NDK sudah terpasang dengan benar di Unity Editor Settings.
4.  Masuk ke **Player Settings** -> konfigurasikan nama paket (bundle identifier) dan setelan orientasi layar ke **Portrait** (vertikal).
5.  Klik **Build** untuk menghasilkan berkas `.apk`.

---

## ⚙️ Panduan Penggunaan Placeholders

Proyek ini menyertakan kerangka modular C# yang siap pakai. Untuk mengganti visual placeholder dengan aset asli Anda:
1.  **Sprites Pesawat**: Ganti sprite default pada renderer di prefab pesawat pemain (`Assets/Prefabs/Player/`) dan pesawat musuh (`Assets/Prefabs/Enemy/`).
2.  **Partikel Ledakan**: Gunakan Particle System URP dan masukkan ke dalam prefab yang dipanggil oleh tag `EnemyExplosionNormal` atau `PlayerExplosionLarge` di `PoolManager`.
3.  **Data Konfigurasi**: Klik kanan di folder aset -> **Create** -> **Sky Assault** untuk membuat tipe senjata baru (`WeaponData`), statistik pesawat (`AircraftData`), atau tingkat level baru (`LevelData`).
