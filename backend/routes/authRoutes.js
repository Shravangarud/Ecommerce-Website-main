const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/signup', registerUser);
router.post('/login', loginUser);

// Protected routes
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

// Wishlist
router.route('/wishlist').get(protect, getWishlist);
router.route('/wishlist/:id')
  .post(protect, addToWishlist)
  .delete(protect, removeFromWishlist);

module.exports = router;
