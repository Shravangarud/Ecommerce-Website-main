const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a product title'],
            trim: true,
        },
        desc: {
            type: String,
            trim: true,
        },
        category: {
            type: String,
            required: [true, 'Please add a category'],
            trim: true,
        },
        price: {
            type: Number,
            required: [true, 'Please add a price'],
            min: 0,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        image: {
            type: String,
            default: '',
        },
        imageName: {
            type: String,
            default: '',
        },
        stock: {
            type: Number,
            default: 100,
            min: 0,
        },
        reviews: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
                name: { type: String, required: true },
                rating: { type: Number, required: true },
                comment: { type: String, required: true },
                createdAt: { type: Date, default: Date.now }
            }
        ],
        rating: {
            type: Number,
            required: true,
            default: 0,
        },
        numReviews: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function () {
    if (this.discount > 0) {
        return (this.price * (1 - this.discount / 100)).toFixed(2);
    }
    return this.price;
});

module.exports = mongoose.model('Product', productSchema);
