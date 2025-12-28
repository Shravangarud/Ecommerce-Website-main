const mongoose = require('mongoose');
// Only require mongodb-memory-server if NOT in production to prevent deployment crashes
const { MongoMemoryServer } = process.env.NODE_ENV === 'production'
  ? { MongoMemoryServer: null }
  : require('mongodb-memory-server');

/**
 * Connect to MongoDB Database
 * Falls back to In-Memory MongoDB if local service is not available
 */
const connectDB = async () => {
  try {
    // Attempt regular connection
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 2000, // Fail fast if no local service
    });

    console.log(`MongoDB Connected (Real): ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[WARNING] Failed to connect to Real MongoDB: ${error.message}`);
    console.log('[INFO] Attempting to start In-Memory MongoDB instead...');

    try {
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();

      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log(`✅ In-Memory MongoDB started at: ${mongoUri}`);
      console.log('[TIP] Data will be reset on server restart.');

      // Auto-seed if in-memory
      const Product = require('../models/Product');
      const User = require('../models/User');

      // Seed default user
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('[INFO] Seeding initial guest user to In-Memory DB...');
        await User.create({
          name: 'Guest User',
          email: 'guest@example.com',
          password: 'password123',
          phone: '9876543210',
          address: {
            address1: '123 Main St',
            city: 'Mumbai',
            country: 'India'
          }
        });
        console.log('✅ Guest user seeded (guest@example.com / password123)');
      }

      const count = await Product.countDocuments();
      if (count === 0) {
        console.log('[INFO] Seeding initial products to In-Memory DB...');
        const products = [
          // Clothing
          { title: "Urban Nomad Oversized Tee", desc: "Heavyweight organic cotton tee in charcoal grey.", category: "Clothing", price: 1299, discount: 15, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80" },
          { title: "Legacy Selvedge Denim Jacket", desc: "Raw indigo denim with reinforced triple-stitch details.", category: "Clothing", price: 4499, discount: 20, image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80" },
          { title: "Elite Stretch-Fit Chinos", desc: "Premium cotton-blend chinos for all-day versatility.", category: "Clothing", price: 2899, discount: 10, image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80" },
          { title: "Azure Bloom Floral Dress", desc: "Flowy sustainable viscose dress with hand-drawn floral print.", category: "Clothing", price: 3800, discount: 25, image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80" },
          { title: "Signature Crisp White Shirt", desc: "Wrinkle-resistant luxury Egyptian cotton shirt.", category: "Clothing", price: 2499, discount: 5, image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80" },
          { title: "Alpine Thermal Puffer Vest", desc: "Insulated water-repellent vest for extreme layering.", category: "Clothing", price: 2999, discount: 30, image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80" },

          // Footwear
          { title: "Apex Speed-Light Runners", desc: "Ultra-breathable mesh sneakers with reactive foam cushioning.", category: "Footwear", price: 5499, discount: 12, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80" },
          { title: "Heritage Leather Chelsea Boots", desc: "Full-grain Italian leather with flexible elastic side panels.", category: "Footwear", price: 7999, discount: 0, image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80" },
          { title: "Minimalist Studio Low-Tops", desc: "Sleek monochromatic canvas shoes with memory foam insoles.", category: "Footwear", price: 2299, discount: 10, image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80" },
          { title: "Vanguard Terrain Hiking Boots", desc: "Waterproof vibram-sole boots for technical trail performance.", category: "Footwear", price: 4800, discount: 15, image: "https://www.heddels.com/wp-content/uploads/2017/11/thursdays-made-in-usa-vanguard-boots-are-a-solid-pair-at-just-249-light-front-side.jpg" },
          { title: "Classic Suede Penny Loafers", desc: "Timeless handcrafted suede loafers with leather lining.", category: "Footwear", price: 3100, discount: 8, image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80" },
          { title: "Nomad Ventilated Sport Sandals", desc: "Multi-strap rugged sandals with anatomical footbed.", category: "Footwear", price: 1899, discount: 5, image: "https://odyssia.in/cdn/shop/files/T6900MH.webp?v=1743243733&width=600" },

          // Electronics
          { title: "Aura Pro Wireless ANC Headphones", desc: "Studio-grade noise cancellation with 40-hour high-fidelity playback.", category: "Electronics", price: 18999, discount: 15, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80" },
          { title: "Quantum V2 Smart Wellness Watch", desc: "Advanced biometric tracking with always-on AMOLED retina display.", category: "Electronics", price: 12999, discount: 20, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80" },
          { title: "Precision-X Wireless Gaming Mouse", desc: "26K DPI optical sensor with zero-latency ultra-lightweight design.", category: "Electronics", price: 3499, discount: 10, image: "https://media.tatacroma.com/Croma%20Assets/Computers%20Peripherals/Computer%20Accessories%20and%20Tablets%20Accessories/Images/259524_0_rkbrwb.png" },
          { title: "SonicBoom IPX7 Waterproof Speaker", desc: "Rugged 360-degree sound with deep bass and floating capability.", category: "Electronics", price: 4999, discount: 25, image: "https://armorsound.com/wp-content/uploads/2025/08/Yeahbox-Sonic-Boom-MAX-300W-Portable-Waterproof-Wireless-Bluetooth-Party-Speaker-In-Depth-Review-1024x682.jpg" },
          { title: "Nexus Mechanical RGB Keyboard", desc: "Hot-swappable tactile switches with aircraft-grade aluminum frame.", category: "Electronics", price: 6499, discount: 18, image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=800&q=80" },
          { title: "TitanView 4K Ultra Action Cam", desc: "Dual-screen 60FPS stabilized footage for extreme perspectives.", category: "Electronics", price: 14000, discount: 12, image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80" },

          // Mobiles & Accessories
          { title: "IonCharge 10000mAh Slim Bank", desc: "Pocket-sized rapid-charge backup with digital status display.", category: "Mobiles", price: 1899, discount: 5, image: "https://m.media-amazon.com/images/I/61tqL2WrizS._AC_UF1000,1000_QL80_.jpg" },
          { title: "Vortex 5G Ultra Smartphone", desc: "Edge-to-edge 120Hz display with pro-grade triple lens system.", category: "Mobiles", price: 54999, discount: 10, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80" },
          { title: "SuperNova 65W GaN Charger", desc: "High-efficiency gallium nitride charger for universal fast power.", category: "Mobiles", price: 2499, discount: 0, image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80" },
          { title: "Symmetry Horween Leather Case", desc: "Premium genuine leather with patinated aging and drop armor.", category: "Mobiles", price: 1499, discount: 0, image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR09Mt_GwsdnMTM7ZoFnSpsHPqpbGQ-r8hWQw&s" },
          { title: "Visionary Bluetooth Selfie Tripod", desc: "Extendable carbon-fiber stand with detachable remote shutter.", category: "Mobiles", price: 1199, discount: 15, image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEEM3OZsvDhasF9UC8XV07U8-Q409bwr_z_g&s" },
          { title: "CrystalShield Tempered Glass Pack", desc: "9H hardness ultra-clear protection with easy align tool.", category: "Mobiles", price: 699, discount: 10, image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8Bqk3FbqOg2Wm_pwRASdFbl1oohOKUTebBA&s" },

          // Accessories
          { title: "Artisan Bifold Calfskin Wallet", desc: "Hand-finished top-grain leather with RFID-blocking security liner.", category: "Accessories", price: 1899, discount: 0, image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80" },
          { title: "Vanguard Aviator Elite Sunglasses", desc: "Classic teardrop frames with polarized UV400 protective lenses.", category: "Accessories", price: 2800, discount: 10, image: "https://static5.lenskart.com/media/catalog/product/pro/1/thumbnail/1080x1080/9df78eab33525d08d6e5fb8d27136e95//v/i/grey-gunmetal-full-rim-aviator-vincent-chase-indoor-glasses-vc-s17425-c1-sunglasses__dsc2054_07_08_2024.jpg" },
          { title: "EcoCanvas Heavy-Duty Tote Bag", desc: "Sustainable 16oz cotton canvas with reinforced box-stitched handles.", category: "Accessories", price: 899, discount: 5, image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80" },
          { title: "Voyager 40L Adventure Duffel", desc: "Ballistic nylon weekend bag with ventilated shoe compartment.", category: "Accessories", price: 3499, discount: 20, image: "https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&w=800&q=80" },
          { title: "Bauhaus Minimalist Leather Watch", desc: "Surgical-grade steel case with Japanese quartz movement and nubuck strap.", category: "Accessories", price: 4999, discount: 12, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80" },
          { title: "StormGuard Pro Windproof Umbrella", desc: "Double-canopy vented construction with automatic open-close system.", category: "Accessories", price: 1299, discount: 0, image: "https://productsfalcontwo.blob.core.windows.net/printimages/A7167-Storm-Guard-Vented-Automatic-Golf-Umbrella-4-Panel-Print-Gallery-thumb400.webp" },

          // Home Decor
          { title: "Ethereal Scandi Oak Table Lamp", desc: "Hand-carved wooden base with premium linen drum shade.", category: "Home", price: 2499, discount: 10, image: "https://fleck.co.in/cdn/shop/products/Skog_Solid_Wood_Table_Lamp_for_Bedside_Tables.jpg?v=1745536000" },
          { title: "Zen Garden Soy Aromatherapy Set", desc: "Four essential-oil infused candles in frosted reusable glass jars.", category: "Home", price: 1499, discount: 5, image: "https://www.esnahome.com/cdn/shop/products/shopify-leblanczen_2.jpg?v=1676452519" },
          { title: "Legacy Roman Numeral Copper Clock", desc: "Silent sweeping movement in an industrial brushed copper frame.", category: "Home", price: 2200, discount: 0, image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=800&q=80" },
          { title: "VelvetTouch Arctic Throw Blanket", desc: "Super-plush faux fur blanket with hypoallergenic fleece backing.", category: "Home", price: 1899, discount: 15, image: "https://decovia.in/cdn/shop/files/4-6copy.jpg?v=1759726405&width=1024" },
          { title: "Abstract Expressionist Canvas Art", desc: "Gallery-wrapped printed canvas with vibrant textured appearance.", category: "Home", price: 3499, discount: 20, image: "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?auto=format&fit=crop&w=800&q=80" },
          { title: "Geometric Hand-Glazed Ceramic Pot", desc: "Modern planter with drainage tray, perfect for indoor succulents.", category: "Home", price: 1250, discount: 0, image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80" }
        ];
        await Product.insertMany(products);
        console.log('✅ Initial products seeded.');
      }
    } catch (innerError) {
      console.error(`🔴 Critical Error: Could not start In-Memory MongoDB: ${innerError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
