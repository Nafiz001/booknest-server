# BookNest - Backend Server

Backend API server for the BookNest Library-to-Home Delivery System built with Express.js and MongoDB.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication with 7-day token expiry
  - Role-based access control (User, Librarian, Admin)
  - Support for email/password and Google OAuth
  - Secure password hashing with bcrypt

- **Book Management**
  - Full CRUD operations for books
  - Search, filter, and sort functionality
  - Category-based organization
  - ISBN validation
  - Librarian book ownership
  - Admin moderation (publish/unpublish)

- **Order System**
  - Delivery and pickup options
  - Order status tracking (pending, confirmed, shipped, delivered, cancelled)
  - User order history
  - Librarian order management

- **User Management**
  - Profile updates
  - Role assignment (Admin only)
  - User authentication tracking

- **Wishlist**
  - Add/remove books from wishlist
  - Unique user-book constraints

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn package manager

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/booknest-server.git
cd booknest-server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/booknest

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Client URL for CORS
CLIENT_URL=http://localhost:5173
```

4. Start the server:
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000`

## 📚 API Documentation

### Authentication Routes (`/api/auth`)

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "authProvider": "email"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123",
  "authProvider": "email"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

### Book Routes (`/api/books`)

#### Get All Books (Public)
```http
GET /api/books?search=harry&category=Fiction&sort=price_asc
```

Query Parameters:
- `search`: Search in title, author, or description
- `category`: Filter by book category
- `sort`: Sort by `price_asc`, `price_desc`, `title_asc`, `title_desc`, `date_desc`

#### Get Single Book
```http
GET /api/books/:id
```

#### Add Book (Librarian only)
```http
POST /api/books
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Book Title",
  "author": "Author Name",
  "description": "Book description",
  "category": "Fiction",
  "price": 29.99,
  "isbn": "1234567890",
  "publisher": "Publisher Name",
  "pages": 350,
  "language": "English",
  "image": "base64_encoded_image_or_url",
  "stock": 10
}
```

#### Update Book (Librarian - own books)
```http
PATCH /api/books/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Title",
  "price": 34.99
}
```

#### Delete Book (Admin only)
```http
DELETE /api/books/:id
Authorization: Bearer {token}
```

#### Publish/Unpublish Book (Admin only)
```http
PATCH /api/books/:id/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "published"
}
```

### Order Routes (`/api/orders`)

#### Create Order
```http
POST /api/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "book": "book_id",
  "deliveryType": "delivery",
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "New York",
    "zipCode": "10001"
  },
  "requestedDate": "2024-12-31",
  "notes": "Please call before delivery",
  "totalAmount": 29.99
}
```

#### Get User Orders
```http
GET /api/orders/user/:userId
Authorization: Bearer {token}
```

#### Get Librarian Orders
```http
GET /api/orders/librarian/:userId
Authorization: Bearer {token}
```

#### Update Order Status (Librarian/Admin)
```http
PATCH /api/orders/:id/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "confirmed"
}
```

#### Cancel Order
```http
DELETE /api/orders/:id
Authorization: Bearer {token}
```

### User Routes (`/api/users`)

#### Get All Users (Admin only)
```http
GET /api/users
Authorization: Bearer {token}
```

#### Update User Profile
```http
PATCH /api/users/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "profilePicture": "url_or_base64",
  "phone": "1234567890"
}
```

#### Update User Role (Admin only)
```http
PATCH /api/users/:id/role
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "librarian"
}
```

### Wishlist Routes (`/api/wishlist`)

#### Get User Wishlist
```http
GET /api/wishlist/:userId
Authorization: Bearer {token}
```

#### Add to Wishlist
```http
POST /api/wishlist
Authorization: Bearer {token}
Content-Type: application/json

{
  "bookId": "book_id"
}
```

#### Remove from Wishlist
```http
DELETE /api/wishlist/:id
Authorization: Bearer {token}
```

## 🗄️ Database Models

### User Model
- name, email, password, role, authProvider, googleUid, profilePicture
- Roles: user, librarian, admin

### Book Model
- title, author, description, category, price, isbn, publisher, publishedDate
- pages, language, image, stock, status, addedBy (librarian)
- Status: draft, published, unpublished

### Order Model
- user, book, deliveryType, deliveryAddress, status, requestedDate
- actualDeliveryDate, totalAmount, paymentStatus, notes
- Status: pending, confirmed, shipped, delivered, cancelled

### Wishlist Model
- user, book, addedAt
- Unique constraint on user-book combination

### Payment Model
- order, amount, paymentMethod, transactionId, status, paymentDate

## 🔒 Security Features

- JWT authentication with HTTP-only cookies
- Password hashing with bcrypt (salt rounds: 10)
- Role-based authorization middleware
- CORS configuration for specific client origins
- Request body size limits (10mb for images)
- Rate limiting (to be implemented)
- Input validation (to be implemented)

## 🚧 Middleware

### Auth Middleware (`middleware/auth.js`)
- `verifyToken`: Validates JWT token from Authorization header or cookies
- `isLibrarian`: Ensures user has librarian or admin role
- `isAdmin`: Ensures user has admin role

## 📁 Project Structure

```
booknest-server/
├── config/
│   └── db.js                 # MongoDB connection
├── middleware/
│   ├── auth.js               # Authentication & authorization
│   ├── validation.js         # Request validation
│   └── rateLimiter.js        # Rate limiting
├── models/
│   ├── User.js
│   ├── Book.js
│   ├── Order.js
│   ├── Payment.js
│   └── Wishlist.js
├── routes/
│   ├── auth.js
│   ├── books.js
│   ├── orders.js
│   ├── users.js
│   └── wishlist.js
├── utils/
│   └── errorHandler.js       # Error handling utilities
├── .env                      # Environment variables
├── .gitignore
├── index.js                  # Server entry point
├── package.json
└── README.md
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | Secret key for JWT signing | - |
| `JWT_EXPIRE` | JWT expiration time | 7d |
| `CLIENT_URL` | Frontend URL for CORS | http://localhost:5173 |

## 📦 Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **cookie-parser**: Parse cookies
- **cors**: Enable CORS
- **dotenv**: Load environment variables
- **express-rate-limit**: Rate limiting
- **joi**: Input validation

## 🧪 Testing

```bash
# Run tests (to be implemented)
npm test
```

## 🚀 Deployment

The server can be deployed to platforms like:
- Heroku
- Railway
- Render
- DigitalOcean
- AWS EC2

Make sure to:
1. Set all environment variables in the hosting platform
2. Use production MongoDB cluster
3. Set `NODE_ENV=production`
4. Update `CLIENT_URL` to production frontend URL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Your Name - [GitHub Profile](https://github.com/yourusername)

## 🙏 Acknowledgments

- Express.js documentation
- MongoDB documentation
- JWT.io for token debugging
