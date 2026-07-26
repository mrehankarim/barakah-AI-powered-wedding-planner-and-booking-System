# Barakah — AI-Powered Wedding Planner & Booking System (Backend API)

**Barakah** is a comprehensive, production-grade backend system designed for wedding planning, vendor discovery, custom package curation, booking management, and customer feedback. Built with Node.js, Express, TypeScript, Prisma ORM, and PostgreSQL.

---

## 🚀 Features & Core Modules

### 1. Authentication & Security (`/api/v1/auth`)
- **User Registration & Roles**: Supports `admin`, `end_user`, and `vendor` user roles.
- **OTP Verification**: Secure email-based OTP verification using Resend email service.
- **JWT Authentication**: Access and Refresh Token authentication with HTTP-Only Cookie support and Bearer header support.
- **Token Refresh**: Endpoint for seamless token renewal.

### 2. Custom Package Builder (`/api/v1/packages`)
- **Package Creation**: Users can create custom wedding packages with budget limits and descriptions.
- **Item Management**: Add vendor listings/tiers to packages, update selections, or remove items.
- **Budget Tracking**: Automatic budget and cost calculation.

### 3. Booking Engine & Payments (`/api/v1/bookings`)
- **Booking Creation**: Reserve vendor listings with event date, guest count, and tier selections.
- **Automated Deposit Milestones**: Automatically generates payment deposit milestones upon booking creation.
- **Cancellation Workflow**: Cancel active bookings with reason tracking and email notification triggers.

### 4. Reviews & Ratings System (`/api/v1/reviews`)
- **Review Submission**: Rate vendor services from 1 to 5 stars with optional feedback text.
- **Public Vendor Reviews**: View aggregate ratings and user reviews for any vendor listing.
- **Management**: Users can edit or delete their submitted reviews.

### 5. User Dashboard (`/api/v1/dashboard`)
- **Overview Endpoints**: Quick access to user's active packages, bookings, reviews, and profile metadata.
- **Profile Updates**: Endpoint to manage user details and preferences.

### 6. Wishlist Management (`/api/v1/wishlist`)
- **Save Listings**: Toggle vendor listings in/out of personal wishlist.
- **Wishlist Fetching**: View all saved vendor listings in one place.

### 7. Automated Email Notifications
- Integration with **Resend** and **React Email** components for sending:
  - Account verification OTP emails
  - Booking confirmation & cancellation emails
  - Review receipt & vendor notification alerts

### 8. Interactive API Documentation (Swagger UI)
- Integrated OpenAPI 3.0 documentation accessible live at **`http://localhost:3000/docs`**.

---

## 🛠️ Technology Stack

- **Runtime & Language**: Node.js & TypeScript
- **Framework**: Express.js
- **Database & ORM**: PostgreSQL & Prisma ORM
- **Authentication**: JSON Web Tokens (JWT) & bcrypt
- **Email Service**: Resend & React Email
- **Testing Framework**: Vitest & Supertest
- **API Docs**: Swagger UI Express & Swagger JSDoc

---

## 📊 API Endpoint Reference

| Module | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Register new account & send OTP |
| **Auth** | `POST` | `/api/v1/auth/verify-otp` | Verify email address via OTP |
| **Auth** | `POST` | `/api/v1/auth/login` | Log in and receive JWT tokens |
| **Auth** | `POST` | `/api/v1/auth/logout` | Log out and clear auth tokens |
| **Auth** | `PATCH` | `/api/v1/auth/update-details` | Update user account details |
| **Auth** | `POST` | `/api/v1/auth/refresh-token` | Refresh access token using refresh token |
| **Packages** | `POST` | `/api/v1/packages` | Create custom wedding package |
| **Packages** | `GET` | `/api/v1/packages` | List user's wedding packages |
| **Packages** | `GET` | `/api/v1/packages/:id` | Get package details by ID |
| **Packages** | `PATCH` | `/api/v1/packages/:id` | Update package title, description, or budget |
| **Packages** | `DELETE` | `/api/v1/packages/:id` | Delete package |
| **Packages** | `POST` | `/api/v1/packages/:id/items` | Add vendor item to package |
| **Packages** | `PATCH` | `/api/v1/packages/:id/items/:itemId` | Update package item tier/notes |
| **Packages** | `DELETE` | `/api/v1/packages/:id/items/:itemId` | Remove item from package |
| **Bookings** | `POST` | `/api/v1/bookings` | Create new booking & generate milestones |
| **Bookings** | `GET` | `/api/v1/bookings` | List user's bookings |
| **Bookings** | `GET` | `/api/v1/bookings/:id` | Get booking details & payment milestones |
| **Bookings** | `PATCH` | `/api/v1/bookings/:id/cancel` | Cancel an active booking |
| **Reviews** | `GET` | `/api/v1/reviews/vendors/:id/reviews` | Get public reviews for a vendor listing |
| **Reviews** | `POST` | `/api/v1/reviews` | Submit review and rating for a vendor |
| **Reviews** | `PATCH` | `/api/v1/reviews/:id` | Update review text or star rating |
| **Reviews** | `DELETE` | `/api/v1/reviews/:id` | Delete a review |
| **Dashboard** | `GET` | `/api/v1/dashboard/packages` | Get user packages overview |
| **Dashboard** | `GET` | `/api/v1/dashboard/bookings` | Get user bookings overview |
| **Dashboard** | `GET` | `/api/v1/dashboard/reviews` | Get user reviews overview |
| **Dashboard** | `PATCH` | `/api/v1/dashboard/profile` | Update profile information |
| **Wishlist** | `POST` | `/api/v1/wishlist` | Toggle vendor listing in wishlist |
| **Wishlist** | `GET` | `/api/v1/wishlist` | Get user's saved wishlist items |
| **Wishlist** | `DELETE` | `/api/v1/wishlist/:listingId` | Remove item from wishlist |

---

## 🧪 Testing

The repository includes comprehensive automated unit and integration test suites located in `tests/`:

- `tests/bookingSystem.test.ts`: Booking creation, milestone generation, cancellation.
- `tests/packageBuilder.test.ts`: Package CRUD, item additions, updates, budget checks.
- `tests/reviewsRatings.test.ts`: Review creation, vendor feedback, updates.
- `tests/userDashboard.test.ts`: Dashboard data summaries and profile management.
- `tests/wishlist.test.ts`: Wishlist add, list, toggle, and delete operations.
- `tests/notificationService.test.ts`: Email notification trigger formatting.

To execute the test suite:
```bash
npm run test
```

---

## ⚙️ Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- npm or yarn

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/barakah_db"
ACCESS_TOKEN_SECRET="your_access_token_secret"
ACCESS_TOKEN_EXPIRY="15m"
REFRESH_TOKEN_SECRET="your_refresh_token_secret"
REFRESH_TOKEN_EXPIRY="10d"
RESEND_EMAIL_VERIFICATION_KEY="re_123456789"
```

### 3. Installation & Database Setup
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

### 4. Start Development Server
```bash
npm run dev
```

Server will run at `http://localhost:3000`.
Swagger UI documentation will be available at **`http://localhost:3000/docs`**.
