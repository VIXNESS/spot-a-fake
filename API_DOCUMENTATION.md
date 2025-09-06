# Authentication REST API Documentation

This document describes the RESTful authentication API endpoints that can be used in external projects.

## Base URL

All endpoints are relative to your application's base URL: `https://your-domain.com/api/auth`

## Authentication

Most endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Endpoints

### 1. Login

**POST** `/api/auth/login`

Authenticate a user with email and password.

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "email_confirmed_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "profile": {
      "id": "profile-uuid",
      "user_id": "user-uuid",
      "role": "user",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "session": {
      "access_token": "jwt-access-token",
      "refresh_token": "jwt-refresh-token",
      "expires_at": 1672531200,
      "expires_in": 3600,
      "token_type": "bearer"
    }
  }
}
```

#### Error Response (401)
```json
{
  "success": false,
  "error": "Invalid login credentials"
}
```

#### Example Usage
```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "userpassword"
  }'
```

---

### 2. Logout

**POST** `/api/auth/logout`

Sign out the current user (invalidates the session).

#### Request Body
No body required. The session is determined from the cookies.

#### Success Response (200)
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

#### Error Response (400)
```json
{
  "success": false,
  "error": "Failed to logout"
}
```

#### Example Usage
```bash
curl -X POST https://your-domain.com/api/auth/logout \
  -H "Content-Type: application/json"
```

---

### 3. Refresh Token

**POST** `/api/auth/refresh`

Refresh an expired access token using a refresh token.

#### Request Body
```json
{
  "refresh_token": "jwt-refresh-token"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "email_confirmed_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "profile": {
      "id": "profile-uuid",
      "user_id": "user-uuid",
      "role": "user",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "session": {
      "access_token": "new-jwt-access-token",
      "refresh_token": "new-jwt-refresh-token",
      "expires_at": 1672534800,
      "expires_in": 3600,
      "token_type": "bearer"
    }
  }
}
```

#### Error Response (401)
```json
{
  "success": false,
  "error": "Invalid refresh token"
}
```

#### Example Usage
```bash
curl -X POST https://your-domain.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "jwt-refresh-token"
  }'
```

---

### 4. Verify Token

**GET** `/api/auth/verify`

Verify if an access token is valid and get user information.

#### Headers
```
Authorization: Bearer <access_token>
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "email_confirmed_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "profile": {
      "id": "profile-uuid",
      "user_id": "user-uuid",
      "role": "user",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "valid": true
  }
}
```

**POST** `/api/auth/verify`

Alternative method to verify token by sending it in the request body.

#### Request Body
```json
{
  "access_token": "jwt-access-token"
}
```

#### Success Response (200)
Same as GET method above.

#### Error Response (401)
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

#### Example Usage
```bash
# Using GET with Authorization header
curl -X GET https://your-domain.com/api/auth/verify \
  -H "Authorization: Bearer jwt-access-token"

# Using POST with token in body
curl -X POST https://your-domain.com/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "jwt-access-token"
  }'
```

---

### 5. Get User Information

**GET** `/api/auth/user`

Get detailed information about the authenticated user.

#### Headers
```
Authorization: Bearer <access_token>
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "email_confirmed_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "last_sign_in_at": "2024-01-01T12:00:00Z"
    },
    "profile": {
      "id": "profile-uuid",
      "user_id": "user-uuid",
      "role": "user",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### Error Response (401)
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

#### Example Usage
```bash
curl -X GET https://your-domain.com/api/auth/user \
  -H "Authorization: Bearer jwt-access-token"
```

---

## Data Models

### User
- `id`: Unique user identifier (UUID)
- `email`: User's email address
- `email_confirmed_at`: Timestamp when email was confirmed
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp
- `last_sign_in_at`: Last sign-in timestamp

### Profile
- `id`: Unique profile identifier (UUID)
- `user_id`: Reference to user ID
- `role`: User role (`"user"` or `"admin"`)
- `email`: User's email address
- `created_at`: Profile creation timestamp
- `updated_at`: Last update timestamp

### Session
- `access_token`: JWT access token for API authentication
- `refresh_token`: JWT refresh token for renewing access tokens
- `expires_at`: Unix timestamp when token expires
- `expires_in`: Seconds until token expires
- `token_type`: Always `"bearer"`

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (invalid/expired token)
- `500`: Internal Server Error

---

## CORS Support

All endpoints include CORS headers to allow cross-origin requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Usage in External Projects

### JavaScript/TypeScript Example

```typescript
class AuthAPI {
  private baseUrl: string;
  private accessToken?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.accessToken = data.data.session.access_token;
    }
    
    return data;
  }

  async getUser() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}/api/auth/user`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
    
    return response.json();
  }

  async logout() {
    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: 'POST',
    });
    
    if (response.ok) {
      this.accessToken = undefined;
    }
    
    return response.json();
  }
}

// Usage
const auth = new AuthAPI('https://your-domain.com');
const loginResult = await auth.login('user@example.com', 'password');
const userInfo = await auth.getUser();
```

### Python Example

```python
import requests

class AuthAPI:
    def __init__(self, base_url):
        self.base_url = base_url
        self.access_token = None

    def login(self, email, password):
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"email": email, "password": password}
        )
        data = response.json()
        
        if data.get("success"):
            self.access_token = data["data"]["session"]["access_token"]
        
        return data

    def get_user(self):
        if not self.access_token:
            raise ValueError("No access token available")
        
        response = requests.get(
            f"{self.base_url}/api/auth/user",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        return response.json()

    def logout(self):
        response = requests.post(f"{self.base_url}/api/auth/logout")
        if response.ok:
            self.access_token = None
        return response.json()

# Usage
auth = AuthAPI("https://your-domain.com")
login_result = auth.login("user@example.com", "password")
user_info = auth.get_user()
```

---

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production to protect tokens in transit
2. **Token Storage**: Store access tokens securely (not in localStorage for web apps)
3. **Token Expiration**: Implement proper token refresh logic
4. **Rate Limiting**: Consider implementing rate limiting on authentication endpoints
5. **Input Validation**: All input is validated server-side
6. **CORS**: Configure CORS appropriately for your use case in production
