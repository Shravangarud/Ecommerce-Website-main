const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = asyncHandler(async (req, res) => {
    const { category, search, sort, page = 1, limit = 8 } = req.query;

    let query = {};

    // Filter by category
    if (category && category !== 'All') {
        query.category = category;
    }

    // Search by title, description, or category
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { desc: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
        ];
    }

    // Sorting
    let sortOption = {};
    if (sort === 'price_asc') sortOption.price = 1;
    if (sort === 'price_desc') sortOption.price = -1;
    if (sort === 'newest') sortOption.createdAt = -1;

    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

    res.json({
        products,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
    });
});

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        res.json(product);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

/**
 * @desc    Create a product
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = asyncHandler(async (req, res) => {
    const { title, desc, category, price, discount, image, imageName, stock } =
        req.body;

    const product = await Product.create({
        title,
        desc,
        category,
        price,
        discount,
        image,
        imageName,
        stock,
    });

    res.status(201).json(product);
});

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        product.title = req.body.title || product.title;
        product.desc = req.body.desc || product.desc;
        product.category = req.body.category || product.category;
        product.price = req.body.price ?? product.price;
        product.discount = req.body.discount ?? product.discount;
        product.image = req.body.image || product.image;
        product.imageName = req.body.imageName || product.imageName;
        product.stock = req.body.stock ?? product.stock;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
};
