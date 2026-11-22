// Event listener ini memastikan kode di dalamnya hanya berjalan setelah seluruh elemen HTML (DOM) selesai dimuat.
document.addEventListener('DOMContentLoaded', () => {
    // Memanggil fungsi untuk menggambar grafik pertama kali agar tidak kosong
    initTelemetryChart();
    
    // Mengeksekusi fungsi fetchSensorFromESP berulang-ulang setiap 3000 milidetik (3 detik).
    // Catatan: Jika koneksi ESP32 lambat, cara ini bisa membuat request menumpuk.
     setInterval(fetchSensorFromESP, 3000);
    
    // Langsung panggil fungsi satu kali saat halaman pertama kali dibuka,
    // sehingga pengguna tidak perlu menunggu 3 detik pertama untuk melihat data.
    fetchSensorFromESP();
});

document.getElementById('connect-wifi').addEventListener('click', () => {
    const ssid = document.getElementById('ssid').value;
    const password = document.getElementById('password').value;

    if (!ssid || !password) {
        alert("Isi SSID dan Password dulu ya!");
        return;
    }

    // Simulasi kirim ke ESP32
    fetch('/set-wifi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid, password })
    })
    .then(res => {
        if (res.ok) {
            document.getElementById('wifi-modal').style.display = 'none';
        } else {
            alert('Gagal konek, coba lagi.');
        }
    })
    .catch(() => alert('Gagal menghubungi ESP32'));
});


// Variabel global untuk menyimpan objek Chart.js agar nanti bisa di-update isinya
let telemetryChart = null;

// Fungsi untuk inisialisasi awal grafik menggunakan library Chart.js
function initTelemetryChart() {
    // Mengambil elemen <canvas> ber-ID 'telemetryChart' di HTML dan mengaturnya ke format 2D
    const ctx = document.getElementById('telemetryChart').getContext('2d');
    
     telemetryChart = new Chart(ctx, {
        type: 'line', // Jenis grafik yang digunakan adalah grafik garis
        data: {
            labels: [], // Tempat menyimpan sumbu X (misal: waktu). Awalnya kosong.
            datasets: [
                {
                    // Konfigurasi garis untuk data Suhu (Temperature)
                    label: 'Temperature (°C)',
                    data: [], // Tempat menyimpan nilai suhu. Awalnya kosong.
                     borderColor: '#d4af37', // Warna garis (kuning keemasan)
                    backgroundColor: 'rgba(212, 175, 55, 0.05)', // Warna isian di bawah garis
                    borderWidth: 2,
                    fill: true, // Area di bawah garis akan diwarnai
                    tension: 0.3, // Membuat garis sedikit melengkung (tidak kaku)
                    pointRadius: 2, // Ukuran titik pada setiap data
                },
                {
                    // Konfigurasi garis untuk data Kelembapan (Humidity)
                    label: 'Humidity (%)',
                
                    data: [], // Tempat menyimpan nilai kelembapan. Awalnya kosong.
                     borderColor: '#10b981', // Warna garis (hijau)
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [4, 4], // Membuat garis menjadi putus-putus
                    tension: 0.3,
                    pointRadius: 2,
                }
            ]
        },
        options: {
            responsive: true, // Grafik akan menyesuaikan ukuran layar/container otomatis
            maintainAspectRatio: false, // Mengabaikan rasio aspek bawaan agar bisa melar/menyusut mengikuti div
            plugins: {
                legend: {
                    // Teks untuk legend grafik
                     labels: { color: '#a1a1aa', font: { family: 'Inter', size: 11 } }
                }
            },
            scales: {
                x: {
                     // Pengaturan garis dan warna teks untuk sumbu X bawah
                    grid: { color: '#27272a' },
                    ticks: { color: '#a1a1aa', font: { size: 10 } }
                },
                y: {
                    // Pengaturan garis dan warna teks untuk sumbu Y kiri
                     grid: { color: '#27272a' },
                    ticks: { color: '#a1a1aa', font: { size: 10 } }
                }
            }
        }
    });
}

// Fungsi untuk mengambil data JSON (suhu, kelembapan, dsb) dari ESP32 via HTTP Request
function fetchSensorFromESP() {
    // WAJIB DIISI! Ganti string kosong ini dengan URL lengkap dari ESP32 Anda.
    // Contoh: 'http://192.168.1.100/data'
    const espIP = '';

    fetch(espIP)
        .then(response => {
            // Jika server (ESP32) memberikan kode error (misal 404 atau 500), lemparkan error ke blok catch
            if (!response.ok) throw new Error("ESP32 offline");
            
            // Jika sukses, ubah format respons mentah (raw text) menjadi format objek JavaScript (JSON)
            return response.json(); 
        })
        .then(data => {
            // Data JSON berhasil ditangkap, lalu kirimkan data tersebut ke fungsi updateUI() untuk memanipulasi tampilan web
            updateUI(data);
        })
         .catch(error => {
            // Blok ini berjalan JIKA terjadi masalah (misal ESP32 mati, tidak ada internet, atau URL kosong)
            
            // Ubah teks indikator suhu dan kelembapan kembali ke tanda strip karena data gagal dimuat
            document.getElementById('temp-value').textContent = '--°C';
            document.getElementById('hum-value').textContent = '--%';
            document.getElementById('temp-status').innerHTML = `<span class="dot" style="background-color: #ef4444;"></span> Connecting...`;
            
            // Ubah status perangkat web (badge) menjadi 'Offline' dengan warna merah (#ef4444)
            const badge = document.getElementById('device-status-badge');
            badge.className = 'status-indicator offline';
            badge.style.color = '#ef4444';
            document.getElementById('status-dot').style.backgroundColor = '#ef4444';
            badge.innerHTML = `<span class="pulse-dot" id="status-dot" style="background-color: #ef4444;"></span> Offline`;
            
            // Reset info detail perangkat karena datanya tidak dapat diakses
            document.getElementById('device-name').textContent = '--';
            document.getElementById('device-firmware').textContent = 'Firmware: --';
            document.getElementById('uptime-counter').textContent = '--:--:--';
        });
}

// Fungsi utama yang bertugas memperbarui teks HTML berdasarkan data terbaru yang dikirim dari ESP32
function updateUI(data) {
    // 1. Update Sensor: Mengisi nilai elemen HTML dengan properti .temperature dan .humidity dari format JSON
    document.getElementById('temp-value').textContent = `${data.temperature}°C`;
    document.getElementById('hum-value').textContent = `${data.humidity}%`;
    document.getElementById('temp-status').innerHTML = `<span class="dot" style="background-color: #10b981;"></span> Live • Synced`;

    // 2. Update Status Device: Menandakan bahwa koneksi berhasil terjalin dan alat berstatus hijau ('Online')
    const badge = document.getElementById('device-status-badge');
    badge.className = 'status-indicator online';
    badge.style.color = '#10b981';
    badge.innerHTML = `<span class="pulse-dot" id="status-dot" style="background-color: #10b981;"></span> Online`;

    // Mengecek apakah JSON yang dikirim menyertakan nama perangkat. Jika tidak, gunakan default "ESP32 Device"
    if (data.device) {
        document.getElementById('device-name').textContent = data.device;
    } else {
        document.getElementById('device-name').textContent = 'ESP32 Device';
    }

    // Mengecek apakah ada informasi versi firmware yang dikirim
    if (data.firmware) {
        document.getElementById('device-firmware').textContent = `Firmware: ${data.firmware}`;
    }

    // 3. Update Uptime: Menghitung detik yang dikirim dari ESP32 agar tampil dengan format jam:menit:detik (HH:MM:SS)
    if (data.uptime !== undefined) {
        const totalSeconds = data.uptime;
        
        // Math.floor untuk membulatkan ke bawah, .padStart(2, '0') untuk memastikan selalu tampil 2 digit (misal: "05" bukan "5")
        const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const secs = String(totalSeconds % 60).padStart(2, '0');
        
        document.getElementById('uptime-counter').textContent = `${hrs}:${mins}:${secs}`;
    }

    // 4. Update Grafik: Menggambar pergerakan nilai pada grafik garis secara dinamis
    if (telemetryChart) {
        // Ambil waktu saat ini dari sistem operasi untuk dijadikan label pada sumbu X
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0].substring(0, 5); // Format: HH:MM
        
        // Membatasi jumlah data yang tampil di grafik maksimal 10 titik terakhir.
        // Jika lebih dari 10, hapus data paling lama (ujung kiri) menggunakan array .shift()
        if (telemetryChart.data.labels.length > 10) {
            telemetryChart.data.labels.shift();
            telemetryChart.data.datasets[0].data.shift(); // Hapus suhu terlama
            telemetryChart.data.datasets[1].data.shift(); // Hapus kelembapan terlama
        }

        // Memasukkan data waktu, suhu, dan kelembapan baru (paling kanan) menggunakan array .push()
        // parseFloat dan parseInt berguna memastikan data JSON dikenali sebagai angka mutlak, bukan string teks.
        telemetryChart.data.labels.push(timeString);
        telemetryChart.data.datasets[0].data.push(parseFloat(data.temperature));
        telemetryChart.data.datasets[1].data.push(parseInt(data.humidity));
        
        // Memerintahkan Chart.js me-render ulang grafik dengan data baru tanpa animasi penuh
        // mode 'none' agar transisi titik tidak melompat aneh pada setiap render update yang cepat
        telemetryChart.data.update('none');
    }
}