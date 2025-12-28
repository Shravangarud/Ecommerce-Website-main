const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Product = require('./models/Product');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        console.log("Connected to DB");
        const count = await Product.countDocuments();
        console.log(`Total Products in DB: ${count}`);

        // List categories to see distribution
        const categories = await Product.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);
        console.log("Categories:", categories);

        process.exit(0);
    })
    .catch((err) => {
        console.log(err);
        process.exit(1);
    });
