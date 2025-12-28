const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load env vars
dotenv.config();

console.log("Checking MongoDB Connection...");
console.log("MONGO_URI is: ", process.env.MONGO_URI ? "DEFINED" : "UNDEFINED");

if (!process.env.MONGO_URI) {
    console.log("❌ MONGO_URI is missing in .env file.");
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
})
    .then((conn) => {
        console.log(`✅ SUCCESS: Connected into MongoDB Atlas!`);
        console.log(`Host: ${conn.connection.host}`);
        process.exit(0);
    })
    .catch((err) => {
        console.log(`❌ FAILURE: Could not connect to MongoDB Atlas.`);
        console.log(`Error: ${err.message}`);
        process.exit(1);
    });
