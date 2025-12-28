const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
});

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        items: [cartItemSchema],
    },
    {
        timestamps: true,
    }
);

// Method to calculate cart total
cartSchema.methods.calculateTotal = async function () {
    await this.populate('items.product');

    let subtotal = 0;
    this.items.forEach((item) => {
        const price = item.product.price;
        const discount = item.product.discount || 0;
        const finalPrice = discount > 0 ? price * (1 - discount / 100) : price;
        subtotal += finalPrice * item.quantity;
    });

    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
    };
};

module.exports = mongoose.model('Cart', cartSchema);
