const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const startTestServer = async () => {
    // 1. Start In-Memory MongoDB
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    console.log(`[TEST] In-Memory MongoDB started at: ${mongoUri}`);

    // Override the MONGO_URI from .env
    process.env.MONGO_URI = mongoUri;

    // 2. Connect to the in-memory database
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log('[TEST] Connected to In-Memory MongoDB');

    // 3. Initialize Express App (simplified version of server.js)
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Import Routes
    const productRoutes = require('./routes/productRoutes');
    const authRoutes = require('./routes/authRoutes');
    const cartRoutes = require('./routes/cartRoutes');
    const orderRoutes = require('./routes/orderRoutes');
    const { notFound, errorHandler } = require('./middleware/errorMiddleware');

    app.use('/api/products', productRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/orders', orderRoutes);

    app.use(notFound);
    app.use(errorHandler);

    const PORT = 5001; // Use a different port for testing
    const server = app.listen(PORT, () => {
        console.log(`[TEST] Test server running on port ${PORT}`);
    });

    return { server, mongoServer };
};

const runTests = async () => {
    const { server, mongoServer } = await startTestServer();
    const baseUrl = 'http://localhost:5001/api';

    try {
        console.log('\n--- STARTING API TESTS ---');

        // Test 1: Register User
        console.log('[1/4] Testing User Registration...');
        const signupRes = await fetch(`${baseUrl}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Admin',
                email: 'admin@test.com',
                password: 'password123',
                phone: '1234567890'
            })
        });
        const signupData = await signupRes.json();
        if (!signupRes.ok) throw new Error(`Signup failed: ${signupData.message}`);
        const token = signupData.token;
        console.log('✅ User registered successfully');

        // Test 2: Create a Product (as Admin - though we don't have admin check strictly enforced yet, but let's see)
        // Wait, current models don't auto-set isAdmin. Let's manually set it in the DB for the user.
        const User = require('./models/User');
        await User.updateOne({ email: 'admin@test.com' }, { isAdmin: true });
        console.log('✅ Manually promoted user to Admin');

        console.log('[2/4] Testing Product Creation...');
        const prodRes = await fetch(`${baseUrl}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Test Product',
                desc: 'Testing API description',
                category: 'Testing',
                price: 99.99,
                stock: 10
            })
        });
        const prodData = await prodRes.json();
        if (!prodRes.ok) throw new Error(`Product creation failed: ${prodData.message}`);
        const productId = prodData._id;
        console.log('✅ Product created successfully:', productId);

        // Test 3: Add to Cart
        console.log('[3/4] Testing Add to Cart...');
        const cartRes = await fetch(`${baseUrl}/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productId: productId,
                quantity: 1
            })
        });
        const cartData = await cartRes.json();
        if (!cartRes.ok) throw new Error(`Add to cart failed: ${cartData.message}`);
        console.log('✅ Item added to cart. Subtotal:', cartData.subtotal);

        // Test 4: Place Order
        console.log('[4/4] Testing Order Placement...');
        const orderRes = await fetch(`${baseUrl}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                customer: {
                    name: 'Test Admin',
                    email: 'admin@test.com',
                    phone: '1234567890',
                    address1: '123 Test St',
                    city: 'Test City',
                    zip: '12345',
                    country: 'USA'
                }
            })
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(`Order placement failed: ${orderData.message}`);
        console.log('✅ Order placed successfully. Order ID:', orderData._id);

        console.log('\n--- ALL TESTS PASSED SUCCESSFULLY! ---');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
    } finally {
        console.log('\n[TEST] Cleaning up...');
        await mongoose.disconnect();
        await mongoServer.stop();
        server.close();
        console.log('[TEST] Cleanup complete. Exiting.');
        process.exit();
    }
};

runTests();
