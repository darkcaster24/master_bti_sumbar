var express = require('express');
var path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

var app = express();
const fs = require('fs');
const serviceAccount = require('./bti-sumbar-firebase.json');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

app.set('view engine', 'ejs');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'bti-sumbar.appspot.com/', // Firebase Storage bucket name
});
  
const bucket = admin.storage().bucket();


app.get('/', (req, res) => {
    res.render('index');
});

// Menangani unggahan file Excel
app.post('/upload', upload.single('excelFile'), function (req, res) {
    const file = req.file;
    const {dataOption} = req.body;
    console.log(dataOption);
  
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
  
    const fileName = file.originalname;
    const fileUpload = bucket.file(fileName);
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });
  
    stream.on('error', (err) => {
      console.error('Error uploading file:', err);
      res.status(500).send('Error uploading file');
    });
  
    stream.on('finish', () => {
      const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  
      if(dataOption=='slipGaji'){
        res.render('cariSlipGaji', { data, fileUrl });
      }
      if(dataOption=='jaminan'){
        res.render('cariJaminan', { data, fileUrl });
      }
    });
  
    stream.end(file.buffer);
});

// Menampilkan hasil perhitungan berdasarkan nama
app.post('/result', function (req, res) {
    console.log(req.body);
    const name = req.body.name;
    const data = JSON.parse(req.body.data);
    
    // Cari data berdasarkan nama yang dimasukkan
    const person = data.find((item) => item.Nama === name);
    
    if (person) {
      // Lakukan perhitungan gaji akhir
      
      const divisi = person['Divisi'];
      const level = person['Level'];
      const jabatan = person['Jabatan'];
      const rekening = person['Rekening'];
      const gaji = person['Gaji Pokok'];
      const tunjangan_pokok = person['Tunjangan Utama'];
      const tunjangan_lain = person['Tunjangan Lain'];
      const total_tunjangan = tunjangan_pokok + tunjangan_lain;
      const gaji_tunjangan = gaji+ total_tunjangan;
      const kpi = person['KPI'];
      const komisi_dsa = person['Komisi DSA'];
      const total_komisi = kpi+komisi_dsa;
      const gaji_komisi = gaji_tunjangan+total_komisi;
      const bpjs_kes = person['Potongan BPJS Kesehatan'];
      const bpjs_ket = person['Potongan BPJS Ketenagakerjaan'];
      const pph_21 = person['Potongan Pph 21'];
      const hp_cicilan = person['Potongan Hp Cicilan 12']
      const absensi = person['Potongan Absensi']
      const potongan = bpjs_kes + bpjs_ket + pph_21 + hp_cicilan + absensi;
      const payout = gaji_komisi - potongan;
      
      
      // Tampilkan hasil perhitungan pada halaman hasil
      res.render('slipGaji', { name, divisi, level, jabatan, rekening, gaji, tunjangan_pokok, tunjangan_lain,
        total_tunjangan,gaji_tunjangan, kpi, komisi_dsa, total_komisi, gaji_komisi, bpjs_kes, bpjs_ket, pph_21,
        hp_cicilan, absensi, potongan, payout});
    } else {
      res.render('slipGaji', { error: 'Nama tidak ditemukan' });
    }
});

app.post('/jaminan', function (req, res) {
    console.log(req.body);
    const name = req.body.name;
    const data = JSON.parse(req.body.data);
    
    // Cari data berdasarkan nama yang dimasukkan
    const person = data.find((item) => item.Nama === name);
    
    if (person) {
      // Lakukan perhitungan gaji akhir
      
      const jabatan = person['Jabatan'];
      const no_ijazah = person['NO Ijazah'];
      const no_bpkb = person['No BPKB'];
      
      
      
      // Tampilkan hasil perhitungan pada halaman hasil
      res.render('jaminan', { name,jabatan, no_ijazah, no_bpkb});
    } else {
      res.render('jaminan', { error: 'Nama tidak ditemukan' });
    }
  });

app.listen(3000, function () {
    console.log('Server berjalan pada http://localhost:3000');
});

module.exports = app;
