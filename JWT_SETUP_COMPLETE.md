# JWT Authentication System - Setup Complete! ✅

## สรุปการติดตั้ง

ระบบ JWT Authentication แบบ Advanced พร้อมใช้งานแล้ว! 🎉

---

## 🔧 Backend (FastAPI) - เสร็จสมบูรณ์

### Endpoints ที่เพิ่ม:

#### 1. **POST `/auth/refresh`** ✅
Refresh access token โดยใช้ refresh token

**Request:**
```json
{
  "refresh_token": "your_refresh_token_here"
}
```

**Response (Success):**
```json
{
  "access_token": "new_access_token",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**Error Responses:**
- `401` - "Refresh token expired"
- `401` - "Invalid refresh token"
- `401` - "Refresh token required"
- `401` - "User not found"

#### 2. **อัพเดต `/auth/login` และ `/auth/register`** ✅
ตอนนี้ return refresh token ด้วย

**Response:**
```json
{
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email@example.com",
    "role": "CUSTOMER",
    "registerDate": "2025-11-10T..."
  }
}
```

### Token Expiry:
- **Access Token**: 24 ชั่วโมง (86400 seconds)
- **Refresh Token**: 7 วัน (604800 seconds)

### Functions ที่เพิ่ม:
- `create_access_token()` - สร้าง access token
- `create_refresh_token()` - สร้าง refresh token (7 days)

---

## 💻 Frontend (Next.js + TypeScript) - เสร็จสมบูรณ์

### ไฟล์ที่สร้าง/แก้ไข:

#### 1. **`src/lib/auth.ts`** ✅
Core authentication utilities

**Functions:**
- `decodeToken()` - Decode JWT token
- `isTokenExpired()` - Check expiration (with 5s buffer)
- `getAccessToken()` / `getRefreshToken()` - Get tokens from localStorage
- `saveTokens()` - Save tokens and calculate expiry
- `clearTokens()` - Clear all tokens
- `refreshAccessToken()` - Call `/auth/refresh` endpoint
- `getValidAccessToken()` - Get token, auto-refresh if expired
- `authenticatedFetch()` - Fetch with auto token management
- `setupTokenRefreshTimer()` - Background timer (check every 60s, refresh 5min before expiry)
- `login()` - Login with username/password
- `logout()` - Logout and redirect

**การใช้งาน:**
```typescript
import { authenticatedFetch, login, logout } from '@/lib/auth';

// Login
const success = await login('username', 'password');

// Authenticated request
const response = await authenticatedFetch('/api/data');

// Logout
logout();
```

#### 2. **`src/contexts/AuthContext.tsx`** ✅
Global authentication state management

**Components & Hooks:**
- `<AuthProvider>` - Context provider component
- `useAuth()` - Hook for auth state
- `withAuth()` - HOC for protected routes

**Features:**
- ✅ Auto-fetch user on mount
- ✅ Token refresh timer setup
- ✅ Auto-logout on expiration
- ✅ SSR-safe navigation

**การใช้งาน:**
```typescript
import { useAuth, withAuth } from '@/contexts/AuthContext';

// ใน component
function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) return <div>Please login</div>;
  return <div>Welcome, {user?.username}!</div>;
}

// Protected route
function AdminPage() {
  return <div>Admin Only</div>;
}
export default withAuth(AdminPage, 'ADMIN');
```

#### 3. **`src/hooks/useAuthFetch.ts`** ✅
Custom hook for authenticated API calls

**การใช้งาน:**
```typescript
import { useAuthFetch } from '@/hooks/useAuthFetch';

function MyComponent() {
  const authFetch = useAuthFetch();
  
  const fetchData = async () => {
    const res = await authFetch('/api/products/my-products');
    const data = await res.json();
  };
}
```

#### 4. **`src/app/layout.tsx`** ✅
Root layout with AuthProvider

```tsx
<AuthProvider>
  <CartProvider>
    {children}
  </CartProvider>
</AuthProvider>
```

---

## 🎯 Features ที่ได้

### 1. **Token Refresh Mechanism** ✅
- Auto-refresh ก่อน token หมดอายุ 5 นาที
- Background timer ตรวจสอบทุก 60 วินาที
- Refresh token มีอายุ 7 วัน

### 2. **Token Expiration Handling** ✅
- Decode JWT เพื่อดู expiration time
- Buffer 5 วินาทีก่อนหมดอายุจริง
- Auto-refresh หาก token ใกล้หมดอายุ

### 3. **Auto-logout** ✅
- Logout อัตโนมัติเมื่อ token หมดอายุ
- Redirect ไป `/login` page
- Clear ทุก token data จาก localStorage

### 4. **Token Interceptor** ✅
- `authenticatedFetch()` wrapper
- Auto-attach Authorization header
- Auto-refresh on 401 response
- Retry request after refresh

---

## 🚀 วิธีใช้งาน

### เริ่มต้น Backend:
```bash
cd api
uvicorn app.main:app --reload
```

### เริ่มต้น Frontend:
```bash
npm run dev
```

### ทดสอบ Login:
1. เปิด browser ไปที่ `http://localhost:3000/login`
2. Login ด้วย username และ password
3. ระบบจะ auto-save tokens และ setup refresh timer

### ตรวจสอบ Tokens:
```javascript
// ใน Browser Console
localStorage.getItem('access_token')
localStorage.getItem('refresh_token')
localStorage.getItem('token_expiry')
```

---

## 🔒 Security Features

1. **Token Expiry Buffer** - ตรวจสอบ 5 วินาทีก่อนหมดอายุจริง
2. **Auto Refresh** - Refresh อัตโนมัติ 5 นาทีก่อนหมดอายุ
3. **Retry Logic** - Auto retry request หลัง refresh token
4. **Auto Logout** - Logout เมื่อไม่สามารถ refresh ได้
5. **Background Timer** - ตรวจสอบ token status ทุกนาที
6. **SSR Safe** - Navigation ทำงานแค่ฝั่ง client

---

## 📝 การ Migrate Code เดิม

### ก่อน:
```typescript
const token = localStorage.getItem('access_token');
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### หลัง:
```typescript
import { useAuthFetch } from '@/hooks/useAuthFetch';

const authFetch = useAuthFetch();
const response = await authFetch(url);
```

หรือ

```typescript
import { authenticatedFetch } from '@/lib/auth';

const response = await authenticatedFetch(url);
```

---

## ✅ Checklist

- [x] Backend: สร้าง `/auth/refresh` endpoint
- [x] Backend: อัพเดต `/auth/login` และ `/auth/register` ให้ return refresh token
- [x] Backend: สร้าง `create_refresh_token()` function
- [x] Frontend: สร้าง `src/lib/auth.ts` utilities
- [x] Frontend: สร้าง `src/contexts/AuthContext.tsx` provider
- [x] Frontend: สร้าง `src/hooks/useAuthFetch.ts` hook
- [x] Frontend: เพิ่ม `<AuthProvider>` ใน `layout.tsx`
- [x] Frontend: Fix SSR issues with router navigation
- [x] Frontend: Update login function ให้ใช้ `/auth/login`
- [x] ไม่มี errors ใน TypeScript/Python

---

## 🎉 พร้อมใช้งาน!

ระบบ JWT Authentication แบบ Advanced พร้อมใช้งานแล้วครับ! ทดสอบได้เลย:

1. Restart backend: `uvicorn app.main:app --reload`
2. Restart frontend: `npm run dev`
3. Login และดูว่า token refresh ทำงานอัตโนมัติ

หากมีปัญหาหรือต้องการความช่วยเหลือเพิ่มเติม แจ้งได้เลยครับ! 🚀
