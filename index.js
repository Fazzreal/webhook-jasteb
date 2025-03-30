const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
app.use(express.json());

// Daftar harga ress
const ressPricing = {
    100: 5000,  // 10 ress = 5000 IDR
    170: 10000, // 25 ress = 12000 IDR
    250: 15000, // 50 ress = 23000 IDR
    320: 20000 // 100 ress = 45000 IDR
};

app.post('/webhook/trakteer', async (req, res) => {
    try {
        const data = req.body;
        
        // Pastikan webhook berasal dari Trakteer
        if (!data || data.status !== 'success') {
            return res.status(400).json({ message: 'Invalid webhook data' });
        }

        // Ambil pesan dan jumlah pembayaran dari donasi
        const message = data.message || '';
        const amountPaid = data.amount || 0;

        const match = message.match(/Email: (\S+)/i);
        const ressMatch = message.match(/Ress: (\d+)/i);
        
        if (!match || !ressMatch) {
            return res.status(400).json({ message: 'Email atau jumlah ress tidak ditemukan dalam pesan' });
        }

        const email = match[1];
        let requestedRess = parseInt(ressMatch[1], 10);

        // Cek apakah harga yang dibayarkan cocok dengan daftar harga
        let finalRess = 0;
        let closestRess = null;

        for (const [ress, price] of Object.entries(ressPricing)) {
            if (amountPaid === price) {
                finalRess = parseInt(ress);
                break;
            } else if (amountPaid > price) {
                closestRess = parseInt(ress);
            }
        }

        if (finalRess === 0 && closestRess !== null) {
            finalRess = closestRess;
        }

        if (finalRess === 0) {
            return res.status(400).json({ message: 'Jumlah pembayaran tidak sesuai dengan harga ress yang tersedia' });
        }

        // Kirim data ke API panel
        const formData = new FormData();
        formData.append('email', email);
        formData.append('ress', finalRess);
        
        const apiResponse = await fetch(`https://${global.paneljasteb}/panel/add`, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders(),
        });

        if (!apiResponse.ok) {
            throw new Error(`Gagal menambahkan email ke API: ${apiResponse.statusText}`);
        }

        res.status(200).json({ message: 'Success', email, ress: finalRess });
    } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Webhook server running on port ${PORT}`);
});
