const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product');
const User = require('./models/User');

dotenv.config({ path: path.join(__dirname, '.env') });

const checkCounts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const productCount = await Product.countDocuments();
        const userCount = await User.countDocuments();

        console.log(`Products: ${productCount}`);
        console.log(`Users: ${userCount}`);

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkCounts();
