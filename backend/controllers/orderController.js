const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

/**
 * @desc    Create new order from cart
 * @route   POST /api/orders
 * @access  Private
 */
const createOrder = asyncHandler(async (req, res) => {
    const { customer } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate(
        'items.product'
    );

    if (!cart || cart.items.length === 0) {
        res.status(400);
        throw new Error('Cart is empty');
    }

    // Prepare order items with product snapshots
    const orderItems = cart.items.map((item) => ({
        product: item.product._id,
        title: item.product.title,
        price: item.product.price,
        discount: item.product.discount,
        quantity: item.quantity,
        image: item.product.image,
    }));

    // Calculate totals
    const totals = await cart.calculateTotal();

    // Create order
    const order = await Order.create({
        user: req.user._id,
        items: orderItems,
        customer,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
    });

    // Clear cart after order creation
    cart.items = [];
    await cart.save();

    // Populate order items for response
    const populatedOrder = await Order.findById(order._id).populate(
        'items.product'
    );

    res.status(201).json(populatedOrder);
});

/**
 * @desc    Get user's orders
 * @route   GET /api/orders
 * @access  Private
 */
const getOrders = asyncHandler(async (req, res) => {
    let query = { user: req.user._id };

    // If admin, show all orders
    if (req.user.isAdmin) {
        query = {};
    }

    const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .populate('items.product');

    res.json(orders);
});

/**
 * @desc    Get order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate('items.product');

    if (order) {
        // Check if order belongs to user (or user is admin)
        if (
            order.user.toString() === req.user._id.toString() ||
            req.user.isAdmin
        ) {
            res.json(order);
        } else {
            res.status(403);
            throw new Error('Not authorized to view this order');
        }
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

/**
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Private/Admin
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
        order.status = status;

        if (status === 'delivered') {
            order.deliveredAt = Date.now();
        }

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
};
