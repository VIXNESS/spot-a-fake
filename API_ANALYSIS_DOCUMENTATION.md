# Image Analysis API Documentation

This API provides endpoints for uploading images and performing AI analysis with streaming responses.

## Authentication

All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

## Endpoints

### 1. Upload Image for Analysis

**POST** `/api/analysis/upload`

Upload an image file and create an analysis record.

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `image` (File): Image file to analyze (max 10MB, images only)
  - `visibility` (string, optional): "private" or "public" (default: "private")

#### Response
```json
{
  "success": true,
  "data": {
    "analysis": {
      "id": "uuid",
      "user_id": "uuid", 
      "image_url": "https://...",
      "visibility": "private",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### Example
```bash
curl -X POST \
  -H "Authorization: Bearer your_token" \
  -F "image=@photo.jpg" \
  -F "visibility=public" \
  http://localhost:3000/api/analysis/upload
```

### 2. Start AI Analysis (Streaming)

**POST** `/api/analysis/{analysisId}/analyze`

Start AI analysis for an uploaded image with real-time streaming results.

#### Request
- **Path Parameters**:
  - `analysisId` (string): ID of the analysis record

#### Response (Server-Sent Events)
The response is a stream of Server-Sent Events with the following message types:

##### Start Message
```json
{
  "type": "start",
  "message": "Starting AI analysis...",
  "analysisId": "uuid"
}
```

##### Progress Message (for each analysis detail)
```json
{
  "type": "progress",
  "step": 1,
  "total": 5,
  "detail": {
    "id": "uuid",
    "analysis_id": "uuid",
    "type": "face_detection",
    "description": "Analyzing facial features and authenticity markers",
    "confidence": 0.85,
    "details": {
      "faces_detected": 1,
      "authenticity_score": 0.85
    },
    "image_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

##### Completion Message
```json
{
  "type": "complete",
  "message": "AI analysis completed successfully",
  "analysisId": "uuid",
  "totalDetails": 5
}
```

##### Error Message
```json
{
  "type": "error",
  "message": "Analysis failed",
  "error": "Error details"
}
```

#### Example
```bash
curl -X POST \
  -H "Authorization: Bearer your_token" \
  -H "Accept: text/event-stream" \
  http://localhost:3000/api/analysis/uuid/analyze
```

### 3. List Analyses

**GET** `/api/analysis`

Get a paginated list of analyses accessible to the user.

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (max 50, default: 10)
- `visibility` (string, optional): Filter by "private" or "public"

#### Response
```json
{
  "success": true,
  "data": {
    "analyses": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "image_url": "https://...",
        "visibility": "private",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 4. Get Analysis Details

**GET** `/api/analysis/{analysisId}`

Get a specific analysis record with all its detail records.

#### Response
```json
{
  "success": true,
  "data": {
    "analysis": {
      "id": "uuid",
      "user_id": "uuid",
      "image_url": "https://...",
      "visibility": "private",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "details": [
      {
        "id": "uuid",
        "analysis_id": "uuid",
        "user_id": "uuid",
        "image_url": "https://...",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 5. Delete Analysis

**DELETE** `/api/analysis/{analysisId}`

Delete an analysis record and its associated image file.

#### Response
```json
{
  "success": true,
  "message": "Analysis deleted successfully"
}
```

## Analysis Types

The AI analysis creates different types of detail records:

1. **face_detection**: Analyzes facial features and authenticity markers
2. **metadata_analysis**: Examines image metadata for manipulation signs
3. **pixel_analysis**: Detects pixel-level inconsistencies and artifacts
4. **lighting_analysis**: Analyzes lighting consistency and shadows
5. **edge_detection**: Examines edge patterns for digital manipulation

## Permissions

- **Users** can:
  - Upload images for analysis
  - Analyze their own images
  - View their own analyses and public analyses
  - Delete their own analyses

- **Admins** can:
  - View all analyses
  - Analyze any image
  - Delete any analysis

## Storage

Images are stored in Supabase Storage in the `analysis-images` bucket with the following structure:
```
analysis-images/
  {user_id}/
    {timestamp}.{extension}
```

## Error Responses

All endpoints may return error responses in this format:
```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error
