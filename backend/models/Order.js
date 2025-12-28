const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    discount: {
        type: Number,
        default: 0,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    image: String,
});

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        items: [orderItemSchema],
        customer: {
            name: {
                type: String,
                required: true,
            },
            email: {
                type: String,
                required: true,
            },
            phone: {
                type: String,
                required: true,
            },
            address1: {
                type: String,
                required: true,
            },
            address2: String,
            city: {
                type: String,
                required: true,
            },
            state: String,
            zip: {
                type: String,
                required: true,
            },
            country: {
                type: String,
                required: true,
            },
        },
        subtotal: {
            type: Number,
            required: true,
        },
        tax: {
            type: Number,
            required: true,
        },
        total: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            default: 'pending',
        },
        paidAt: Date,
        deliveredAt: Date,
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Order', orderSchema);
