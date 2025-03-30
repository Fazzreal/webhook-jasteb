const express = require("express");
const fetch = require("node-fetch");
const FormData = require("form-data");
const app = express();

app.use(express.json());

// Daftar harga ress
const hargaRess = {
    100: 5000,  
    200: 9000,  
    500: 20000  
};

app.post("/webhook/saweria", async (req, res) => {
    const data = req.body.data; // Data utama dari Saweria

    if (!data || !data.message || !data.amount) {
        return res.status(400).json({ success: false, message: "Data tidak valid" });
    }

    // Ambil email dan jumlah ress dari pesan
    const message = data.message;
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    const ressMatch = message.match(/\d+/);

    if (!emailMatch || !ressMatch) {
        return res.status(400).json({ success: false, message: "Format pesan salah" });
    }

    const email = emailMatch[0];
    const jumlahRess = parseInt(ressMatch[0]);
    const jumlahBayar = parseInt(data.amount);

    console.log(`Email: ${email}, Jumlah Ress: ${jumlahRess}, Dibayar: ${jumlahBayar}`);

    // Cek apakah jumlah pembayaran cocok dengan harga ress
    let ressYangDidapat = 0;

    for (const [ress, harga] of Object.entries(hargaRess)) {
        if (jumlahBayar >= harga) {
            ressYangDidapat = ress;
        }
    }

    if (ressYangDidapat === 0) {
        return res.status(400).json({ success: false, message: "Jumlah pembayaran tidak valid" });
    }

    // Kirim email ke API Panel
    try {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("amount", ressYangDidapat);

        const apiResponse = await fetch("https://fazz.cloud77.biz.id/panel/add", {
            method: "POST",
            body: formData,
            headers: formData.getHeaders(),
        });

        const responseData = await apiResponse.json();
        console.log("Response API Panel:", responseData);

        res.status(200).json({ success: true, message: `Ress ${ressYangDidapat} ditambahkan untuk ${email}` });
    } catch (error) {
        console.error("Error saat menghubungi API Panel:", error);
        res.status(500).json({ success: false, message: "Gagal menambahkan ke panel" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Webhook berjalan di port ${PORT}`);
});
