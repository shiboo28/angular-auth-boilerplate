# Angular Auth Boilerplate — Frontend

Angular 21 authentication boilerplate with JWT, role-based access control, email verification, and a premium dark-themed UI.

## 🌐 Live Deployment

- **Frontend**: [https://angular-auth-boilerplate.onrender.com](https://angular-auth-boilerplate.onrender.com)
- **Backend API**: [https://node-mysql-api-production.up.railway.app](https://node-mysql-api-production.up.railway.app)
- **API Docs (Swagger)**: [https://node-mysql-api-production.up.railway.app/api-docs](https://node-mysql-api-production.up.railway.app/api-docs)

## 🚀 Features

- **Registration** with email verification flow
- **Login / Logout** with JWT + Refresh Token
- **Role-Based Access Control** (Admin panel restricted to Admin users)
- **Profile Management** (view & update account details)
- **Admin Panel** (manage all accounts — CRUD operations)
- **Forgot Password / Reset Password** flow
- **Fake Backend** for offline testing (Stage A demo)
- **Premium dark-themed UI** with glassmorphism design

## 📦 Tech Stack

| Technology | Purpose |
|---|---|
| Angular 21 | Frontend framework |
| TypeScript | Type-safe development |
| RxJS | Reactive state management |
| Bootstrap 5 | UI component library |
| LESS | CSS preprocessor |

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- Angular CLI (`npm install -g @angular/cli`)

### 1. Clone the repository
```bash
git clone https://github.com/shiboo28/angular-auth-boilerplate.git
cd angular-auth-boilerplate
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure API URL
Edit `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000' // Your backend API URL
};
```

### 4. Run development server
```bash
ng serve
```
Open [http://localhost:4200](http://localhost:4200)

### 5. Build for production
```bash
ng build --configuration production
```

## 🧪 Testing Modes

### Stage A: Fake Backend (Offline Testing)
Enable the fake backend interceptor in `src/app/app.module.ts`:
```typescript
providers: [
  // ... other providers
  fakeBackendProvider  // Add this line
]
```

### Stage B: Live API (Integration Testing)
Disable the fake backend and set `apiUrl` in `environment.prod.ts` to your deployed backend URL.

## 📂 Project Structure

```
src/app/
├── _components/     # Shared components (Alert)
├── _helpers/        # Guards, interceptors, validators
├── _models/         # TypeScript models (Account, Role)
├── _services/       # API services (AccountService, AlertService)
├── account/         # Login, Register, Verify, Reset flows
├── admin/           # Admin panel (account management)
├── home/            # Home page
└── profile/         # User profile management
```

## 🔐 Authentication Flow

1. **Register** → Verification email sent → Click link to verify
2. **Login** → JWT token (15min) + Refresh token cookie (7 days)
3. **Auto-refresh** → JWT refreshed automatically before expiry
4. **Logout** → Revoke refresh token + clear cookie
