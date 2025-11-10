# JWT Authentication System - Implementation Guide

## ฟีเจอร์ที่เพิ่ม

### 1. **Token Refresh Mechanism**
- ระบบ refresh token อัตโนมัติก่อน token หมดอายุ 5 นาที
- ใช้ refresh token เพื่อขอ access token ใหม่
- จัดการ token expiry time ใน localStorage

### 2. **Token Expiration Handling**
- ตรวจสอบ token expiry ก่อนทุก API call
- Decode JWT token เพื่อดู expiration time
- Auto-refresh หาก token ใกล้หมดอายุ

### 3. **Auto-logout เมื่อ Token หมดอายุ**
- Background timer ตรวจสอบ token ทุกนาที
- Auto-logout และ redirect ไป /login เมื่อ token หมดอายุ
- Clear ทุก token data จาก localStorage

### 4. **Token Interceptor**
- `authenticatedFetch()` - Wrapper สำหรับ fetch ที่จัดการ token อัตโนมัติ
- Auto-attach Authorization header
- Auto-refresh token หาก response เป็น 401
- Retry request หลัง refresh token สำเร็จ

## ไฟล์ที่สร้างใหม่

### 1. `/src/lib/auth.ts`
**Utility functions สำหรับจัดการ JWT:**
- `decodeToken()` - Decode JWT token
- `isTokenExpired()` - ตรวจสอบว่า token หมดอายุหรือไม่
- `getAccessToken()` / `getRefreshToken()` - ดึง token จาก localStorage
- `saveTokens()` / `clearTokens()` - จัดการ token storage
- `refreshAccessToken()` - Refresh token ใหม่
- `getValidAccessToken()` - ดึง token ที่ valid (auto-refresh ถ้าจำเป็น)
- `authenticatedFetch()` - Fetch พร้อม auto token management
- `setupTokenRefreshTimer()` - Background timer สำหรับ auto-refresh
- `login()` / `logout()` - Authentication actions

### 2. `/src/contexts/AuthContext.tsx`
**React Context สำหรับ Authentication:**
- `AuthProvider` - Provider component
- `useAuth()` - Hook สำหรับใช้ auth context
- `withAuth()` - HOC สำหรับ protected routes
- Auto-refresh token ใน background
- Manage user state globally

### 3. `/src/hooks/useAuthFetch.ts`
**Custom Hook สำหรับ authenticated API calls:**
- Wrapper ของ `authenticatedFetch()`
- Auto-logout หาก authentication ล้มเหลว
- Easy to use ในทุก component

## วิธีใช้งาน

### 1. ใช้ useAuth Hook
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  
  if (!isAuthenticated) return <div>Please login</div>;

  return <div>Welcome, {user?.username}!</div>;
}
```

### 2. ใช้ useAuthFetch Hook
```typescript
import { useAuthFetch } from '@/hooks/useAuthFetch';

function MyComponent() {
  const authFetch = useAuthFetch();

  const fetchData = async () => {
    const response = await authFetch('/api/data');
    const data = await response.json();
  };
}
```

### 3. Protected Route
```typescript
import { withAuth } from '@/contexts/AuthContext';

function AdminPage() {
  return <div>Admin Content</div>;
}

export default withAuth(AdminPage, 'ADMIN');
```

### 4. Manual Token Management
```typescript
import { 
  getValidAccessToken, 
  authenticatedFetch,
  logout 
} from '@/lib/auth';

// Get valid token (auto-refresh if needed)
const token = await getValidAccessToken();

// Make authenticated request
const response = await authenticatedFetch(url, options);

// Logout
logout();
```

## Backend Requirements

Backend (FastAPI) ต้องเพิ่ม endpoint:

```python
@app.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    # Verify refresh token
    # Generate new access token
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,  # Optional
        "token_type": "bearer",
        "expires_in": 3600  # seconds
    }
```

## การ Config

### Environment Variables
```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### Token Storage
- `access_token` - Access token
- `refresh_token` - Refresh token (ถ้ามี)
- `token_expiry` - Expiry timestamp

## Security Features

1. **Token Expiry Buffer**: ตรวจสอบ 5 วินาทีก่อนหมดอายุจริง
2. **Auto Refresh**: Refresh อัตโนมัติ 5 นาทีก่อนหมดอายุ
3. **Retry Logic**: ลอง refresh และ retry request อัตโนมัติ
4. **Auto Logout**: Logout อัตโนมัติเมื่อไม่สามารถ refresh ได้
5. **Background Timer**: ตรวจสอบ token status ทุกนาที

## Migration Guide

### แปลง fetch ปกติเป็น authenticated fetch:

**ก่อน:**
```typescript
const token = localStorage.getItem('access_token');
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` }
});
```

**หลัง:**
```typescript
const authFetch = useAuthFetch();
const response = await authFetch(url);
```

หรือ

```typescript
import { authenticatedFetch } from '@/lib/auth';
const response = await authenticatedFetch(url);
```

## คุณสมบัติเด่น

✅ **Auto Token Refresh** - ไม่ต้องกังวลเรื่อง token หมดอายุ
✅ **Auto Logout** - ปลอดภัยเมื่อ session จบ
✅ **Retry Logic** - Auto retry เมื่อ 401
✅ **Global State** - User state พร้อมใช้ทุกที่
✅ **Type Safe** - Full TypeScript support
✅ **Easy Migration** - เปลี่ยนง่าย จาก code เดิม
