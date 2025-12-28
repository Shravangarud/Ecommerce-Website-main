# E-Commerce Backend API

A complete RESTful API for an e-commerce platform built with Node.js, Express, and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based user authentication with protected routes
- **User Management**: User registration, login, profile management
- **Product Management**: CRUD operations for products with search and filtering
- **Shopping Cart**: Add, update, remove items with automatic price calculations
- **Order Management**: Create orders from cart, view order history, track order status
- **Security**: Password hashing with bcryptjs, JWT tokens, protected routes
- **Database**: MongoDB with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JSON Web Tokens (JWT)
- **Password Hashing**: bcryptjs
- **Environment Variables**: dotenv

## Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Setup environment variables**:
Create a `.env` file in the backend directory (see `.env.example`):
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=30d
```

3. **Start MongoDB**:
Make sure MongoDB is running on your system.

4. **Seed database** (optional):
```bash
npm run seed
```

5. **Start the server**:
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/signup` | Register new user | No |
| POST | `/login` | Login user | No |
| GET | `/profile` | Get user profile | Yes |
| PUT | `/profile` | Update user profile | Yes |

### Product Routes (`/api/products`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all products | No |
| GET | `/:id` | Get product by ID | No |
| POST | `/` | Create product | Yes (Admin) |
| PUT | `/:id` | Update product | Yes (Admin) |
| DELETE | `/:id` | Delete product | Yes (Admin) |

**Query Parameters for GET /**:
- `category` - Filter by category
- `search` - Search in title, description, or category

### Cart Routes (`/api/cart`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get user cart | Yes |
| POST | `/` | Add item to cart | Yes |
| PUT | `/:productId` | Update item quantity | Yes |
| DELETE | `/:productId` | Remove item from cart | Yes |
| DELETE | `/` | Clear entire cart | Yes |

### Order Routes (`/api/orders`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create order from cart | Yes |
| GET | `/` | Get user's orders | Yes |
| GET | `/:id` | Get order by ID | Yes |
| PUT | `/:id/status` | Update order status | Yes (Admin) |

## Request/Response Examples

### Register User
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response:
{
  "_id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Add to Cart
```bash
POST /api/cart
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 2
}
```

### Create Order
```bash
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "address1": "123 Main St",
    "city": "New York",
    "zip": "10001",
    "country": "USA"
  }
}
```

## Database Models

### User
- name, email, password (hashed), phone, address
- isAdmin flag for admin privileges
- Timestamps (createdAt, updatedAt)

### Product
- title, desc, category, price, discount, image
- stock tracking
- Timestamps

### Cart
- user reference
- items array with product reference and quantity
- Timestamps

### Order
- user reference
- items array (snapshot of products at time of order)
- customer shipping information
- subtotal, tax, total
- status (pending, processing, shipped, delivered, cancelled)
- Timestamps

## Security Features

- Passwords hashed with bcryptjs
- JWT token-based authentication
- Protected routes with middleware
- Admin-only routes for sensitive operations
- Input validation on models

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

Error response format:
```json
{
  "message": "Error description",
  "stack": "Stack trace (development only)"
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Seed database
npm run seed

# Destroy database data
npm run seed -- -d
```

## License

ISC
