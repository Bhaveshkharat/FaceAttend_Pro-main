const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    console.log("Testing connection string...");
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log("✅ Connection Successful!");
        const db = mongoose.connection.db;
        const status = await db.admin().command({ isMaster: 1 });
        console.log("Replica Set Name:", status.setName);
        console.log("Hosts:", status.hosts);
        process.exit(0);
    } catch (err) {
        console.error("❌ Connection Failed:", err.message);
        process.exit(1);
    }
}

test();
