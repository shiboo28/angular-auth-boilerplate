# Angular Auth Backend API

Node.js + Express + MySQL authentication API with JWT, refresh tokens, email verification, and role-based access control (RBAC).

## 🌐 Live Deployment

- **API**: [https://node-mysql-api-production.up.railway.app](https://node-mysql-api-production.up.railway.app)
- **API Docs (Swagger)**: [https://node-mysql-api-production.up.railway.app/api-docs](https://node-mysql-api-production.up.railway.app/api-docs)
- **Frontend**: [https://angular-auth-boilerplate.onrender.com](https://angular-auth-boilerplate.onrender.com)

## 🚀 Features

- **JWT Authentication** with 15-minute token expiry
- **Refresh Token** rotation (7-day cookie-based)
- **Email Verification** via Nodemailer (Ethereal for testing)
- **Password Reset** with secure token-based flow
- **Role-Based Access Control** (Admin / User)
- **Swagger API Documentation** at `/api-docs`
- **MySQL Database** via Sequelize ORM

## 📦 Tech Stack

| Technology | Purpose |
|---|---|
| Node.js + Express | API Server |
| MySQL + Sequelize | Database + ORM |
| JWT (jsonwebtoken) | Authentication |
| bcryptjs | Password hashing |
| Nodemailer | Email verification |
| Swagger (swagger-jsdoc) | API documentation |

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8.0+

### 1. Clone the repository
```bash
git clone https://github.com/shiboo28/node-mysql-api.git
cd node-mysql-api
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Required variables:
| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` or `MYSQL_URL` | MySQL connection string | `mysql://root:pass@localhost:3306/angular_auth` |
| `JWT_SECRET` | Secret key for JWT signing | `your-random-secret-key-here` |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:4200` |
| `PORT` | Server port | `4000` |

### 4. Run development server
```bash
npm run dev
```

### 5. View API Documentation
Open [http://localhost:4000/api-docs](http://localhost:4000/api-docs)

## 📋 API Endpoints

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/accounts/authenticate` | Login | No |
| POST | `/accounts/register` | Register new account | No |
| POST | `/accounts/verify-email` | Verify email address | No |
| POST | `/accounts/forgot-password` | Request password reset | No |
| POST | `/accounts/validate-reset-token` | Validate reset token | No |
| POST | `/accounts/reset-password` | Reset password | No |
| POST | `/accounts/refresh-token` | Refresh JWT token | Cookie |
| POST | `/accounts/revoke-token` | Logout / revoke token | Bearer |
| GET | `/accounts` | Get all accounts | Bearer |
| GET | `/accounts/:id` | Get account by ID | Bearer |
| PUT | `/accounts/:id` | Update account | Bearer |
| DELETE | `/accounts/:id` | Delete account | Bearer |

## 🔐 Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire in 15 minutes
- Refresh tokens are HTTP-only, secure cookies
- No sensitive data in git (`.env` is gitignored)
- CORS restricted to specific frontend origin
