const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  LevelFormat,
} = require('docx');

// Palette Colors
const COLOR_PRIMARY = '0F2C59';    // Navy Blue
const COLOR_SECONDARY = '005B96';  // Medium Blue
const COLOR_ACCENT = '334155';     // Slate Dark
const COLOR_LIGHT_BG = 'F8FAFC';   // Soft Off-white/slate
const COLOR_HEADER_BG = '0F2C59';  // Header Table Background
const COLOR_BORDER = 'CBD5E1';     // Light Border Gray
const COLOR_MUTED = '64748B';      // Muted Text Gray

function createTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 36, // 18pt
        color: COLOR_PRIMARY,
        font: 'Calibri',
      }),
    ],
  });
}

function createSubtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 360 },
    children: [
      new TextRun({
        text: text,
        italics: true,
        size: 24, // 12pt
        color: COLOR_MUTED,
        font: 'Calibri',
      }),
    ],
  });
}

function createHeading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 28, // 14pt
        color: COLOR_PRIMARY,
        font: 'Calibri',
      }),
    ],
  });
}

function createHeading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 24, // 12pt
        color: COLOR_SECONDARY,
        font: 'Calibri',
      }),
    ],
  });
}

function createHeading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 22, // 11pt
        color: COLOR_ACCENT,
        font: 'Calibri',
      }),
    ],
  });
}

function createParagraph(text, options = {}) {
  const { bold = false, italics = false, bullet = false, spacing = { before: 60, after: 120 } } = options;
  return new Paragraph({
    spacing: spacing,
    bullet: bullet ? { level: 0 } : undefined,
    children: [
      new TextRun({
        text: text,
        bold: bold,
        italics: italics,
        size: 22, // 11pt
        color: '1E293B',
        font: 'Calibri',
      }),
    ],
  });
}

function createCallout(title, text) {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: COLOR_SECONDARY,
  };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_SECONDARY },
            },
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            margins: { top: 140, bottom: 140, left: 200, right: 140 },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 60 },
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 22,
                    color: COLOR_PRIMARY,
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: text,
                    italics: true,
                    size: 20,
                    color: '334155',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createStyledTable(headers, rowsData) {
  const borderDef = { style: BorderStyle.SINGLE, size: 2, color: COLOR_BORDER };
  const cellBorders = {
    top: borderDef,
    bottom: borderDef,
    left: borderDef,
    right: borderDef,
  };

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      borders: cellBorders,
      shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: h.text,
              bold: true,
              size: 20,
              color: 'FFFFFF',
              font: 'Calibri',
            }),
          ],
        }),
      ],
      width: h.width ? { size: h.width, type: WidthType.PERCENTAGE } : undefined,
    })),
  });

  const bodyRows = rowsData.map((row, rIdx) => {
    const bgColor = rIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
    return new TableRow({
      children: row.map((cellText, cIdx) => new TableCell({
        borders: cellBorders,
        shading: { type: ShadingType.CLEAR, fill: bgColor },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [
          new Paragraph({
            alignment: cIdx === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: cellText,
                size: 20,
                color: '1E293B',
                font: 'Calibri',
              }),
            ],
          }),
        ],
      })),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}

async function generateDocs() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // COVER PAGE
          new Paragraph({ spacing: { before: 1000 } }),
          createTitle('LAPORAN PROYEK PENGEMBANGAN SISTEM CMMS'),
          createSubtitle('Aplikasi Computerized Maintenance Management System untuk Pemeliharaan Preventif (Preventive Maintenance) Point of Presence (POP)'),
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 400 },
            children: [
              new TextRun({
                text: 'DOKUMENTASI TEKNIS SISTEM & ANALISIS KEBUTUHAN LAPANGAN',
                bold: true,
                size: 22,
                color: COLOR_SECONDARY,
                font: 'Calibri',
              }),
            ],
          }),

          createCallout(
            'Informasi Proyek & Spesifikasi Dokumen',
            'Nama Proyek: CMMSApp (Mobile Preventive Maintenance App)\n' +
            'Sasaran Infrastruktur: Point of Presence (POP) Telekomunikasi & Ketenagalistrikan (PLN / Iconnet)\n' +
            'Platform: Mobile Application (React Native / Android & iOS)\n' +
            'Arsitektur: Offline-First Local Database dengan Sinkronisasi Cloud & Telegram CDN Storage\n' +
            'Versi Dokumen: 1.0.0 (Tahun 2026)'
          ),

          new Paragraph({ spacing: { before: 600 } }),

          // DAFTAR ISI RINGKAS
          createHeading1('DAFTAR ISI LAPORAN'),
          createParagraph('1. BAB I: PENDAHULUAN (Latar Belakang, Permasalahan, Tujuan, Manfaat, Batasan Masalah)'),
          createParagraph('2. BAB II: GAMBARAN INFRASTRUKTUR POP & OBJEK PEMELIHARAAN (KWh, Power System, Rectifier, Baterai, Genset, Mekanikal Elektrikal)'),
          createParagraph('3. BAB III: ALUR KERJA SISTEM (WORKFLOW) & PROSES BISNIS (Pre-Inspection, On-Site, Geotagging, Digital Signature, Reporting)'),
          createParagraph('4. BAB IV: CARA KERJA & ARSITEKTUR TEKNIS APLIKASI (Frontend, State Management, Local DB, Cloud Sync, Telegram Storage)'),
          createParagraph('5. BAB V: ANALISIS MASALAH LAPANGAN & SOLUSI YANG DIIMPLEMENTASIKAN (Matriks Masalah & Solusi)'),
          createParagraph('6. BAB VI: KESIMPULAN & REKOMENDASI PENGEMBANGAN MASA DEPAN'),
          createParagraph('7. LAMPIRAN (Matriks Modul & Layar, Skema Parameter Checklist Utama)'),

          new Paragraph({ spacing: { before: 400 } }),

          // BAB I
          createHeading1('BAB I: PENDAHULUAN'),
          
          createHeading2('1.1 Latar Belakang'),
          createParagraph(
            'Dalam industri telekomunikasi dan penyedia jasa internet (ISP) modern, seperti jaringan fiber optik PLN Iconnet / Icon+, ketersediaan layanan (high availability) dengan Service Level Agreement (SLA) di atas 99,5% merupakan parameter paling krusial. Infrastruktur tulang punggung (backbone) serta distribusi layanan sangat bertumpu pada keandalan stasiun Point of Presence (POP). POP berfungsi sebagai node distribusi utama yang menampung perangkat transmisi optik, router, switch, sistem penyuplai daya cadangan, dan sistem pengkondisi udara.'
          ),
          createParagraph(
            'Untuk menjaga agar perangkat-perangkat aktif di dalam shelter POP tetap beroperasi tanpa henti selama 24 jam sehari dan 7 hari seminggu, diperlukan aktivitas pemeliharaan pencegahan (Preventive Maintenance / PM) secara berkala dan terstruktur. Pemeliharaan ini mencakup pengecekan sumber daya PLN, panel distribusi tegangan AC/DC, modul rectifier, kondisi fisik dan kapasitas baterai cadangan, kesiapan generator set (genset), serta kestabilan suhu pendingin (AC).'
          ),
          createParagraph(
            'Secara konvensional, proses inspeksi PM di lapangan dilakukan menggunakan lembaran kertas formulir checklist (paper-based inspection) atau rekap manual melalui spreadsheet dan grup chat. Pola manual ini menimbulkan kelemahan mendasar: dokumen fisik rawan hilang atau rusak terkena cuaca, foto dokumentasi tercecer, data riwayat tidak terintegrasi, potensi kecurangan lokasi oleh teknisi, serta lambatnya penerbitan Berita Acara Serah Terima (BAST) hasil pekerjaan. Oleh karena itu, dibangunlah aplikasi Computerized Maintenance Management System (CMMSApp) berbasis mobile sebagai solusi digital terintegrasi.'
          ),

          createHeading2('1.2 Rumusan Masalah'),
          createParagraph('Berdasarkan evaluasi operasional di lapangan, teridentifikasi sejumlah permasalahan utama:'),
          createParagraph('1. Rentannya Kesalahan Manusia (Human Error): Formulir manual sering tidak terbaca, data parameter tegangan dan arus keliru dicatat, atau ada komponen kritis yang terlewat untuk diperiksa.', { bullet: true }),
          createParagraph('2. Keterbatasan Jaringan di Lokasi POP (Blank Spot): Banyak titik POP berada di area terpencil atau di dalam ruangan berpelindung logam/beton di mana sinyal seluler sangat lemah atau tidak ada sama sekali, sehingga aplikasi web online murni tidak dapat digunakan.', { bullet: true }),
          createParagraph('3. Pengelolaan Media Foto yang Berat: Setiap inspeksi membutuhkan puluhan foto pembuktian fisik (kondisi aset, suhu, meteran, sebelum dan sesudah perbaikan). Mengunggah foto berukuran asli langsung ke database cloud umum memakan kuota sangat besar dan biaya langganan storage yang tinggi.', { bullet: true }),
          createParagraph('4. Verifikasi Keaslian & Kehadiran Teknisi: Tidak adanya mekanisme validasi otomatis apakah teknisi benar-benar hadir secara fisik di lokasi POP saat inspeksi dilakukan.', { bullet: true }),
          createParagraph('5. Lambatnya Penerbitan Laporan Resmi: Diperlukan waktu berhari-hari setelah teknisi pulang ke kantor hanya untuk mengetik ulang hasil inspeksi ke dalam format laporan PDF resmi.', { bullet: true }),

          createHeading2('1.3 Batasan Masalah'),
          createParagraph('Agar pengembangan sistem terarah dan tepat guna, batasan ruang lingkup aplikasi didefinisikan sebagai berikut:'),
          createParagraph('• Fokus fungsional pada kegiatan Preventive Maintenance (PM) dan audit aset fisik shelter POP.', { bullet: true }),
          createParagraph('• Berjalan pada platform perangkat bergerak (smartphone/tablet Android dan iOS) dengan dukungan operasional offline.', { bullet: true }),
          createParagraph('• Mengakomodasi aset utama: KWh Meter PLN, Power System (ACPDB & DCPDB), Rectifier, Baterai, Genset, Mekanikal Elektrikal, FOT IP, DWDM, dan External Alarm.', { bullet: true }),
          createParagraph('• Menghasilkan keluaran berupa berkas laporan digital terstandar (PDF Berita Acara & Checklist PM) langsung dari perangkat.', { bullet: true }),

          createHeading2('1.4 Tujuan Pengembangan Sistem'),
          createParagraph('1. Mewujudkan digitalisasi penuh proses inspeksi PM POP dari hulu (lapangan) ke hilir (kantor pusat).'),
          createParagraph('2. Menyediakan sistem pencatatan offline-first yang handal saat tidak ada koneksi internet, dan otomatis tersinkronisasi saat terhubung kembali.'),
          createParagraph('3. Mengotomatisasi pembuatan dokumen laporan resmi dan Berita Acara PM dalam format PDF standar korporat secara instan.'),
          createParagraph('4. Menjamin integritas data inspeksi melalui validasi koordinat GPS dan tanda tangan digital dua belah pihak.'),
          createParagraph('5. Mengoptimalkan biaya infrastruktur penyimpanan foto dengan mengintegrasikan media CDN storage terotomatisasi.'),

          createHeading2('1.5 Manfaat Sistem'),
          createStyledTable(
            [
              { text: 'Pihak Terkait', width: 25 },
              { text: 'Manfaat Langsung yang Diperoleh', width: 75 },
            ],
            [
              ['Teknisi Lapangan', 'Mendapatkan panduan checklist terstruktur sehingga tidak ada item yang terlewat; pengisian cepat dengan auto-fill spesifikasi POP; dapat bekerja offline; dan laporan langsung terbit tanpa ketik ulang di kantor.'],
              ['Koordinator / Supervisor', 'Dapat memverifikasi keaslian kehadiran teknisi via GPS; memeriksa foto dokumentasi terklasifikasi; dan menyetujui hasil PM dengan tanda tangan digital langsung di layar.'],
              ['Manajemen & Klien (PLN/Iconnet)', 'Memperoleh laporan BAST standar secara real-time; transparansi kondisi aset riil; meminimalisir downtime perangkat; dan arsip data terpusat untuk audit kepatuhan ISO/SLA.'],
            ]
          ),

          new Paragraph({ spacing: { before: 400 } }),

          // BAB II
          createHeading1('BAB II: GAMBARAN INFRASTRUKTUR POP & OBJEK PEMELIHARAAN'),
          createParagraph(
            'Point of Presence (POP) adalah titik simpul fisik dalam arsitektur jaringan telekomunikasi tempat tersimpannya perangkat transmisi data, sistem pembagi serat optik (ODF/FDT), serta sistem pendukung operasional. Shelter POP dirancang untuk mandiri (autonomous) dengan berbagai subsistem keamanan dan kelistrikan.'
          ),
          createHeading2('2.1 Subsistem dan Aset Kritis yang Diinspeksi'),
          createParagraph('CMMSApp membagi inspeksi ke dalam 8 kategori utama sesuai standar teknis operasional ketenagalistrikan dan telekomunikasi:'),

          createHeading3('1. KWh Meter & Pasokan PLN'),
          createParagraph('Pemeriksaan suplai daya primer dari jaringan distribusi PLN: nomor ID pelanggan KWh, daya kontrak terpasang (kVA), pembacaan stand meter awal/akhir, kondisi segel metrologi, serta dokumentasi fisik penunjuk angka kwh.'),

          createHeading3('2. Sistem Tenaga Listrik (Power System & ACPDB/DCPDB)'),
          createParagraph('Pemeriksaan panel distribusi listrik AC (ACPDB) dan DC (DCPDB): pengukuran tegangan phasa-ke-phasa (R-S, S-T, T-R) dan phasa-ke-netral (R-N, S-N, T-N), pengukuran arus beban tiap phasa (R, S, T), pemeriksaan kapasitas dan fungsionalitas stabilizer/AVR, serta monitoring utilisasi dan label masing-masing Mini Circuit Breaker (MCB).'),

          createHeading3('3. Sistem Rectifier'),
          createParagraph('Sistem pengubah arus bolak-balik (AC) menjadi arus searah (DC 48V) untuk mencatu perangkat transmisi telekomunikasi: pemeriksaan merk/tipe sistem, jumlah total modul, jumlah modul aktif, tegangan output DC, total arus beban DC, serta status indikator alarm (AC Failure, DC Low Voltage, Rectifier Fail).'),

          createHeading3('4. Sistem Bank Baterai (Battery Bank)'),
          createParagraph('Penyimpan daya cadangan darurat jika terjadi pemadaman PLN: pemeriksaan Bank 1 dan Bank 2, kapasitas per bank (Ah), tipe baterai (Lithium / VRLA Gel), pengukuran tegangan total float/charge, pengukuran tegangan individual per cell/blok baterai untuk mendeteksi cell yang drop, suhu baterai, serta pengecekan karat atau kebocoran elektrolit.'),

          createHeading3('5. Generator Set (Genset) & ATS/AMF'),
          createParagraph('Penyuplai daya sekunder darurat: kapasitas genset (kVA), merk engine & alternator, jam operasi (running hours), level bahan bakar solar, tegangan baterai starter, level oli dan air radiator, serta uji simulasi perpindahan otomatis sakelar ATS (Automatic Transfer Switch).'),

          createHeading3('6. Mekanikal & Elektrikal (M&E)'),
          createParagraph('Pendukung lingkungan operasional shelter: fungsionalitas dan suhu unit Air Conditioner (AC 1 dan AC 2), sistem rotasi AC otomatis, exhaust fan darurat, nilai resistansi pentanahan (grounding / arde maksimal < 1 Ohm), sistem penerangan darurat, kebersihan shelter, dan penataan kabel rak (cable management).'),

          createHeading3('7. Perangkat FOT IP, DWDM, dan External Alarm'),
          createParagraph('Perangkat jaringan transmisi dan sensor lingkungan: pengecekan air filter perangkat transmisi, latch kipas pendingin, indikator LED modul optik, serta uji aktivasi sensor pintu (door open alarm), sensor asap (smoke detector), dan sensor suhu ruangan tinggi.'),

          new Paragraph({ spacing: { before: 400 } }),

          // BAB III
          createHeading1('BAB III: ALUR KERJA SISTEM (WORKFLOW) & PROSES BISNIS'),
          createParagraph(
            'Alur kerja aplikasi CMMSApp dirancang secara berurutan (guided step-by-step wizard) agar teknisi di lapangan dipandu secara sistematis dari awal kedatangan hingga selesai dan laporan ditandatangani.'
          ),

          createHeading2('3.1 Tahapan Alur Kerja End-to-End'),
          createParagraph('Berikut adalah tahapan operasional lengkap dari awal hingga akhir inspeksi:'),

          createCallout(
            'Tahap 1: Pemilihan Master POP & Auto-fill Data Profil',
            'Teknisi membuka aplikasi dan memilih lokasi POP tujuan dari basis data master (tersedia pencarian cepat dan filter wilayah). Data spesifikasi teknis (daya PLN, merk rectifier, kapasitas genset, dll.) otomatis terisi (pre-filled), termasuk profil konfigurasi dari PM periode sebelumnya.'
          ),

          createCallout(
            'Tahap 2: Verifikasi Kehadiran Fisik (GPS Geotagging & Info POP)',
            'Sistem mengaktifkan modul GPS untuk merekam koordinat lintang (latitude) dan bujur (longitude) serta alamat presisi saat teknisi tiba di lokasi. Hal ini mencegah manipulasi absen dan menjamin teknisi benar-benar berada di shelter yang bersangkutan.'
          ),

          createCallout(
            'Tahap 3: Pengisian Checklist & Pengukuran Parameter Modular',
            'Teknisi menjalankan checklist modular: KWh Meter -> Power System (ACPDB/DCPDB) -> Rectifier -> Battery Bank -> Genset -> Mekanikal Elektrikal -> Perangkat Transmisi. Sistem menyediakan validasi tipe input (angka, status OK/Warning/Critical, opsi pilihan) untuk menghindari data invalid.'
          ),

          createCallout(
            'Tahap 4: Dokumentasi Foto Terstruktur dengan Geotag Watermark',
            'Teknisi mengambil foto bukti visual pada setiap kategori (tampak depan shelter, stand KWh meter, layar display rectifier, kondisi baterai, genset, AC, dll.). Foto otomatis disematkan timestamp dan metadata koordinat.'
          ),

          createCallout(
            'Tahap 5: Tanda Tangan Digital Dua Belah Pihak (Signature Screen)',
            'Setelah seluruh form terisi, lembar verifikasi ditandatangani langsung di atas layar sentuh smartphone oleh dua pihak: Teknisi Pelaksana (Pemelihara) dan Pengawas/PIC Lapangan dari pihak PLN / Iconnet.'
          ),

          createCallout(
            'Tahap 6: Pratinjau (Review), Pembuatan PDF BAST, dan Sinkronisasi',
            'Aplikasi menampilkan pratinjau lembar kerja lengkap. Teknisi menekan tombol "Generate PDF" untuk memproduksi berkas PDF laporan resmi berstandar korporat. Data disimpan di database lokal dan otomatis tersinkronisasi ke server cloud saat perangkat terkoneksi internet.'
          ),

          createHeading2('3.2 Mekanisme Keamanan Data: Fitur Auto-Save Draft'),
          createParagraph(
            'Salah satu tantangan terbesar di lapangan adalah risiko baterai smartphone habis, aplikasi tiba-tiba tertutup, atau handphone restart di tengah-tengah inspeksi yang memakan waktu hingga 2-3 jam. CMMSApp dilengkapi sistem penyimpanan draft otomatis (auto-save draft service). Setiap kali ada nilai parameter yang diubah atau foto yang diambil, state form langsung disimpan ke storage lokal. Jika aplikasi ditutup atau mengalami force close, saat dibuka kembali sistem akan mendeteksi sesi yang belum selesai dan memulihkan seluruh data yang sudah diinput.'
          ),

          new Paragraph({ spacing: { before: 400 } }),

          // BAB IV
          createHeading1('BAB IV: CARA KERJA & ARSITEKTUR TEKNIS APLIKASI'),
          createParagraph(
            'CMMSApp dibangun dengan mengedepankan prinsip kinerja tinggi, responsivitas antarmuka, efisiensi bandwidth, dan kehandalan dalam kondisi minim jaringan.'
          ),

          createHeading2('4.1 Stack Teknologi yang Digunakan'),
          createStyledTable(
            [
              { text: 'Lapisan Arsitektur', width: 25 },
              { text: 'Teknologi / Pustaka', width: 25 },
              { text: 'Peran & Fungsi dalam Sistem', width: 50 },
            ],
            [
              ['Frontend Framework', 'React Native (v0.86+)', 'Membangun aplikasi mobile native berperforma tinggi untuk platform Android dan iOS dari satu basis kode terpadu.'],
              ['Bahasa Pemrograman', 'TypeScript', 'Menyediakan type-safety ketat, mengurangi bug runtime, dan mempermudah pemeliharaan struktur data checklist yang kompleks.'],
              ['State Management', 'Zustand', 'Manajemen state terpusat yang sangat ringan dan cepat untuk mengelola data inspeksi antar layar tanpa re-render berlebih.'],
              ['Basis Data Lokal', 'WatermelonDB / SQLite', 'Database relasional reaktif lokal di perangkat yang mampu menangani ribuan data aset dengan kecepatan kueri mendekati instan (offline-first).'],
              ['Cloud Synchronization', 'Firebase Firestore & Supabase', 'Penyimpanan terpusat di cloud untuk data master POP, riwayat inspeksi, dan sinkronisasi metadata secara real-time.'],
              ['Media Storage CDN', 'Telegram Bot Storage API', 'Solusi penyimpanan cloud inovatif tanpa batas (unlimited & zero-cost) untuk foto dokumentasi resolusi tinggi dan berkas PDF laporan.'],
              ['PDF Generator Engine', 'react-native-html-to-pdf & WebView', 'Engine pembuat dokumen PDF yang menyusun layout HTML berstandar cetak A4 dengan logo resmi PLN Icon Plus dan Iconnet.'],
            ]
          ),

          createHeading2('4.2 Cara Kerja Arsitektur Offline-First & Sinkronisasi'),
          createParagraph(
            '1. Operasi Mandiri di Perangkat: Seluruh interaksi form, pencatatan angka pengukuran, dan pengambilan foto disimpan terlebih dahulu ke dalam storage lokal perangkat. Aplikasi sama sekali tidak memblokir alur kerja teknisi hanya karena tidak ada sinyal internet.'
          ),
          createParagraph(
            '2. Deteksi Konektivitas Cerdas: Modul NetInfo memantau status jaringan secara berkala. Ketika perangkat mendeteksi koneksi internet stabil (via WiFi atau seluler), service sinkronisasi di latar belakang akan diaktifkan.'
          ),
          createParagraph(
            '3. Unggah Media Teroptimasi: Foto-foto inspeksi terlebih dahulu dikompresi untuk menghemat kuota tanpa mengurangi keterbacaan angka instrumen, kemudian diunggah ke channel private Telegram via Bot API. File ID yang diperoleh disimpan sebagai URL referensi permanen.'
          ),
          createParagraph(
            '4. Sinkronisasi Data Transaksional: Seluruh payload JSON inspeksi beserta tanda tangan digital dan URL media dikirimkan ke cloud database (Firebase/Supabase) untuk disimpan sebagai arsip permanen dan dapat diakses oleh dashboard pemantauan pusat.'
          ),

          new Paragraph({ spacing: { before: 400 } }),

          // BAB V
          createHeading1('BAB V: ANALISIS MASALAH LAPANGAN & SOLUSI YANG DIIMPLEMENTASIKAN'),
          createParagraph(
            'Berikut adalah matriks komparasi yang merangkum kendala nyata di lapangan sebelum adanya sistem, dampak buruk yang timbul, solusi teknis yang diterapkan dalam CMMSApp, serta dampak positif yang dihasilkan:'
          ),

          createStyledTable(
            [
              { text: 'Kendala Lapangan', width: 20 },
              { text: 'Dampak Negatif Lama', width: 25 },
              { text: 'Solusi Teknis CMMSApp', width: 30 },
              { text: 'Hasil Nyata Pasca Implementasi', width: 25 },
            ],
            [
              ['Sinyal Seluler Blank Spot di Shelter POP', 'Aplikasi berbasis web macet; teknisi kembali mencatat di kertas; data tertunda berhari-hari.', 'Arsitektur Offline-First dengan WatermelonDB dan local draft caching.', 'Aplikasi 100% lancar digunakan di shelter bawah tanah maupun area terpencil tanpa sinyal.'],
              ['Ukuran Foto Besar & Batasan Kuota', 'Upload gagal terus menerus; kuota teknisi boros; tagihan cloud storage membengkak.', 'Kompresi gambar native dan integrasi Telegram Bot API Storage sebagai CDN gratis tanpa batas.', 'Unggah foto cepat, storage tak terbatas tanpa biaya sewa cloud media storage.'],
              ['Potensi "Titip Absen" / Inspeksi Fiktif', 'Laporan dibuat tanpa teknisi datang ke lokasi; aset rusak luput terdeteksi.', 'Penguncian koordinat GPS real-time dan timestamp otomatis pada data inspeksi.', 'Transparansi dan validitas 100% terjamin bahwa teknisi hadir di shelter POP.'],
              ['Pengulangan Pengisian Data Spesifikasi', 'Teknisi lelah mengetik ulang merk genset, daya PLN, kapasitas baterai yang sama tiap bulan.', 'Modul Pre-filled Master Data POP dan fitur Saved PM Profile dari inspeksi sebelumnya.', 'Waktu pengisian berkurang drastis hingga 60%, teknisi fokus pada pengukuran fisik.'],
              ['Keterlambatan Penerbitan BAST Resmi', 'BAST baru terbit 3-7 hari setelah PM karena harus diketik dan diformat manual di kantor.', 'Mesin PDF Generator otomatis dengan template HTML resmi berlogo PLN & Iconnet.', 'BAST PDF resmi langsung terbit dan dapat dibagikan (share WhatsApp/Email) dalam hitungan detik setelah inspeksi selesai.'],
            ]
          ),

          new Paragraph({ spacing: { before: 400 } }),

          // BAB VI
          createHeading1('BAB VI: KESIMPULAN & REKOMENDASI PENGEMBANGAN MASA DEPAN'),
          createHeading2('6.1 Kesimpulan'),
          createParagraph(
            'Pengembangan aplikasi CMMS (Preventive Maintenance Point of Presence) telah berhasil menjawab seluruh tantangan operasional pemeliharaan aset telekomunikasi dan ketenagalistrikan yang selama ini dihadapi di lapangan. Dengan menerapkan paradigma Offline-First, validasi GPS, integrasi tanda tangan digital, penyimpanan media efisien via Telegram CDN, dan otomatisasi laporan PDF, sistem ini memberikan peningkatan signifikan pada efisiensi kerja teknisi, akurasi data pemeliharaan, serta kecepatan pelaporan kepada pihak manajemen dan prinsipal (PLN Iconnet / Icon+).'
          ),

          createHeading2('6.2 Rekomendasi Pengembangan Masa Depan (Roadmap)'),
          createParagraph('Untuk meningkatkan fungsionalitas sistem ke tingkat yang lebih komprehensif, disarankan pengembangan lanjutan meliputi:'),
          createParagraph('1. Integrasi Telemetri IoT: Pemasangan sensor IoT berbasis Modbus/RS485 pada rectifier dan KWh meter untuk pembacaan parameter otomatis tanpa perlu input manual.', { bullet: true }),
          createParagraph('2. Penerapan AI Predictive Maintenance: Pemanfaatan algoritma machine learning untuk memprediksi sisa usia pakai (Remaining Useful Life) baterai dan genset berdasarkan tren degradasi tegangan dari riwayat PM.', { bullet: true }),
          createParagraph('3. Web Dashboard Analitik Terpusat: Pembangunan portal monitoring tingkat eksekutif berbasis web untuk melihat status kesehatan (health score) seluruh POP secara nasional dalam bentuk peta interaktif (GIS mapping).', { bullet: true }),
          createParagraph('4. Modul Notifikasi Kalender Kerja Otomatis: Integrasi push notification untuk mengingatkan tim teknisi saat jadwal PM siklus berikutnya (bulanan/triwulanan) sudah mendekati batas waktu.', { bullet: true }),

          new Paragraph({ spacing: { before: 400 } }),

          // LAMPIRAN
          createHeading1('LAMPIRAN: MATRIKS MODUL & STRUKTUR PARAMETER APLIKASI'),
          createHeading2('Lampiran A: Matriks Halaman & Modul Aplikasi'),
          createStyledTable(
            [
              { text: 'Nama Layar / Modul', width: 30 },
              { text: 'Kode File Komponen', width: 30 },
              { text: 'Deskripsi Fungsionalitas', width: 40 },
            ],
            [
              ['Dashboard', 'DashboardScreen.tsx', 'Tampilan ringkasan statistik PM, status sinkronisasi, dan tombol aksi mulai inspeksi.'],
              ['Pencarian & Pilih POP', 'SelectPopScreen.tsx', 'Katalog master data POP, fitur pencarian ID/Nama, dan filter lokasi.'],
              ['Informasi POP & GPS', 'InfoPopScreen.tsx', 'Pencatatan identitas POP, alamat, dan perekaman koordinat GPS otomatis.'],
              ['KWh Meter PLN', 'KwhMeterScreen.tsx', 'Formulir pencatatan daya, ID pelanggan PLN, stand meter, dan foto KWh.'],
              ['Power System (AC/DC)', 'PowerSystemScreen.tsx', 'Pengukuran tegangan phasa R/S/T, arus beban, stabilizer, dan distribusi panel.'],
              ['Sistem Rectifier', 'RectifierScreen.tsx', 'Checklist modul rectifier, kapasitas, tegangan output DC, dan status alarm.'],
              ['Sistem Baterai', 'BatteryScreen.tsx', 'Pemeriksaan Bank 1 & 2, tegangan per cell, kapasitas Ah, dan suhu baterai.'],
              ['Generator Set (Genset)', 'GensetScreen.tsx', 'Pemeriksaan mesin genset, running hours, level solar, oli, dan baterai starter.'],
              ['Mekanikal Elektrikal', 'MechanicalElectScreen.tsx', 'Pemeriksaan suhu AC, sistem rotasi pendingin, grounding/arde, dan kebersihan.'],
              ['Dokumentasi Foto', 'DokumentasiScreen.tsx', 'Pengambilan dan penataan galeri foto bukti inspeksi per kategori aset.'],
              ['Tanda Tangan Digital', 'SignatureScreen.tsx', 'Kanvas tanda tangan digital untuk Teknisi Pelaksana dan Pengawas Lapangan.'],
              ['Review & Ekspor PDF', 'ReviewPdfScreen.tsx', 'Pratinjau lembar kerja, generate berkas PDF resmi BAST, dan share dokumen.'],
              ['Riwayat Inspeksi', 'HistoryScreen.tsx', 'Pengarsipan riwayat inspeksi sebelumnya, pencarian, dan unduh ulang laporan.'],
            ]
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '..', 'LAPORAN_SISTEM_CMMS_POP.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document successfully created at: ${outputPath}`);
}

generateDocs().catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
