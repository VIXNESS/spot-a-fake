# Analysis API Documentation

This document provides comprehensive documentation for all RESTful APIs and HTTP streaming APIs in the `/api/analysis` endpoint group.

## Overview

The Analysis API provides endpoints for managing and analyzing images for luxury brand authenticity detection. The system supports object detection, image segmentation, AI-powered analysis, and real-time streaming of analysis progress.

## Base URL

```
/api/analysis
```

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### 1. List Analyses

**Endpoint:** `GET /api/analysis`

**Description:** Retrieves a paginated list of analyses based on user permissions.

#### Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 10 | Number of items per page (max 50) |
| `visibility` | string | null | Filter by visibility: 'private' or 'public' |

#### Response

```json
{
  "success": true,
  "data": {
    "analyses": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "image_url": "string",
        "visibility": "private|public",
        "ai_confidence": 0.85,
        "ai_result_text": "string",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Authorization Rules

- **Regular Users:** Can see their own analyses and public analyses
- **Admin Users:** Can see all analyses
- **Visibility Filter:** Can be applied by both user types

#### Error Responses

- `401 Unauthorized`: Missing or invalid Bearer token
- `500 Internal Server Error`: Database query failure

---

### 2. Upload Image for Analysis

**Endpoint:** `POST /api/analysis/upload`

**Description:** Uploads an image file and creates a new analysis record.

#### Request Body

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File | Yes | Image file (max 10MB) |
| `visibility` | string | No | 'private' or 'public' (default: 'private') |

#### Response

```json
{
  "success": true,
  "data": {
    "analysis": {
      "id": "uuid",
      "user_id": "uuid",
      "image_url": "string",
      "visibility": "private|public",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### Validation Rules

- **File Type:** Must be an image (MIME type starts with 'image/')
- **File Size:** Maximum 10MB
- **Visibility:** Must be 'private' or 'public'

#### Error Responses

- `400 Bad Request`: Missing image file, invalid file type, or file too large
- `401 Unauthorized`: Missing or invalid Bearer token
- `500 Internal Server Error`: Upload or database failure

---

### 3. Get Analysis Details

**Endpoint:** `GET /api/analysis/[analysisId]`

**Description:** Retrieves detailed information about a specific analysis, including all analysis details.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `analysisId` | string | UUID of the analysis |

#### Response

```json
{
  "success": true,
  "data": {
    "analysis": {
      "id": "uuid",
      "user_id": "uuid",
      "image_url": "string",
      "visibility": "private|public",
      "ai_confidence": 0.85,
      "ai_result_text": "string",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "details": [
      {
        "id": "uuid",
        "analysis_id": "uuid",
        "user_id": "uuid",
        "image_url": "string",
        "ai_confidence": 0.92,
        "ai_result_text": "string",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### Authorization Rules

- **Owner:** Can view their own analyses
- **Admin:** Can view all analyses
- **Public:** Any authenticated user can view public analyses
- **Private:** Only owner or admin can view

#### Error Responses

- `401 Unauthorized`: Missing or invalid Bearer token
- `403 Forbidden`: Insufficient permissions to view analysis
- `404 Not Found`: Analysis does not exist
- `500 Internal Server Error`: Database query failure

---

### 4. Delete Analysis

**Endpoint:** `DELETE /api/analysis/[analysisId]`

**Description:** Deletes an analysis and all associated data, including images from storage.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `analysisId` | string | UUID of the analysis to delete |

#### Response

```json
{
  "success": true,
  "message": "Analysis deleted successfully"
}
```

#### Authorization Rules

- **Owner:** Can delete their own analyses
- **Admin:** Can delete any analysis

#### Cleanup Process

1. Deletes analysis record from database (cascades to analysis_detail)
2. Removes image file from Supabase Storage
3. Returns success even if storage deletion fails

#### Error Responses

- `401 Unauthorized`: Missing or invalid Bearer token
- `403 Forbidden`: Insufficient permissions to delete analysis
- `404 Not Found`: Analysis does not exist
- `500 Internal Server Error`: Database deletion failure

---

### 5. Analyze Image (Streaming)

**Endpoint:** `POST /api/analysis/[analysisId]/analyze`

**Description:** Performs comprehensive AI analysis on an uploaded image with real-time streaming progress updates.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `analysisId` | string | UUID of the analysis to process |

#### Response Type

**Content-Type:** `text/event-stream`

#### Streaming Events

The API streams various types of events during the analysis process:

##### Event: Start
```json
{
  "type": "start",
  "message": "Starting AI analysis...",
  "analysisId": "uuid"
}
```

##### Event: YOLO Analysis
```json
{
  "type": "yolo_analysis",
  "message": "Starting object detection and segmentation..."
}
```

##### Event: Detections Found
```json
{
  "type": "detections_found",
  "message": "Found 3 objects to analyze",
  "data": {
    "detectionCount": 3,
    "detectionTypes": ["person", "handbag", "shoe"]
  }
}
```

##### Event: Processing Detection
```json
{
  "type": "processing_detection",
  "message": "Processing person detection 1/3",
  "data": {
    "detectionType": "person",
    "confidence": 0.95,
    "progress": 1,
    "total": 3
  }
}
```

##### Event: AI Analysis Step
```json
{
  "type": "ai_analysis_step",
  "step": "luxury_analysis",
  "message": "Analyzing luxury image to identify brand and product...",
  "data": {
    "brand": "Louis Vuitton",
    "confidence": 0.89
  },
  "segmentInfo": {
    "detectionIndex": 0,
    "segmentIndex": 0,
    "detectionType": "person",
    "totalDetections": 3,
    "totalSegments": 2
  }
}
```

##### Event: Streaming Analysis Content
```json
{
  "type": "ai_analysis_step",
  "step": "fake_goods_streaming",
  "message": "Examining the Louis Vuitton logo placement and stitching quality..."
}
```

##### Event: Progress Update
```json
{
  "type": "progress",
  "step": 2,
  "total": 5,
  "detail": {
    "id": "detail_uuid",
    "type": "human_segment_1_part_1",
    "description": "Analysis of human 1 segment part 1 (confidence: 95.0%)",
    "confidence": 0.87,
    "segmentIndex": "0_0",
    "coordinates": {
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 300
    },
    "manipulationDetected": false
  }
}
```

##### Event: Summary Progress
```json
{
  "type": "summary_progress",
  "message": "Generating overall analysis summary..."
}
```

##### Event: Summary Complete
```json
{
  "type": "summary_complete",
  "summary": {
    "overallResult": "authentic",
    "confidence": 0.85,
    "summary": "Overall Analysis Summary: High confidence that the image is authentic...",
    "authenticityAssessment": "High confidence that the image is authentic. All analysis components show consistent patterns typical of genuine content."
  },
  "message": "Analysis summary saved successfully"
}
```

##### Event: Complete
```json
{
  "type": "complete",
  "message": "AI analysis completed successfully",
  "analysisId": "uuid",
  "totalDetails": 5
}
```

##### Event: Error
```json
{
  "type": "error",
  "message": "Analysis failed",
  "error": "Error message details"
}
```

#### Analysis Pipeline

The streaming analysis follows this comprehensive pipeline:

1. **Object Detection (YOLO API)**
   - Detects objects in the image (people, handbags, shoes, etc.)
   - Filters detections with confidence ≥ 0.62
   - Crops detected objects for individual analysis

2. **Human Segmentation**
   - For detected people: crops human area
   - Uses Segformer API to segment clothing/body parts
   - Each segment analyzed individually

3. **AI Analysis per Segment**
   - **Luxury Brand Analysis**: Identifies brand and product type
   - **Authenticity Detection**: Analyzes for counterfeit indicators
   - **Translation**: Translates results to Chinese
   - Streams real-time progress for each step

4. **Data Storage**
   - Uploads segment images to Supabase Storage
   - Saves analysis details to database
   - Links all segments to main analysis

5. **Summary Generation**
   - Calculates overall confidence score
   - Generates comprehensive summary
   - Updates main analysis record

#### Fallback Behavior

If object detection fails, the system:
- Analyzes the entire image as a single unit
- Provides full image analysis results
- Maintains streaming progress updates

#### Authorization Rules

- **Owner:** Can analyze their own uploads
- **Admin:** Can analyze any analysis

#### Error Responses

- `401 Unauthorized`: Missing or invalid Bearer token
- `403 Forbidden`: Insufficient permissions to analyze
- `404 Not Found`: Analysis does not exist
- `500 Internal Server Error`: Analysis pipeline failure

---

## Analysis Result Structure

### Luxury Analysis Result
```json
{
  "confidence": 0.89,
  "brand": "Louis Vuitton",
  "product": "Handbag"
}
```

### Authenticity Analysis Result
```json
{
  "authentic_probability": 0.85,
  "confidence_level": "high",
  "key_findings": [
    "Logo placement is consistent with authentic products",
    "Stitching quality meets brand standards"
  ],
  "red_flags": [],
  "authentic_indicators": [
    "Correct font usage in branding",
    "Proper hardware finish"
  ],
  "overall_assessment": "The item shows strong indicators of authenticity...",
  "recommendation": "Likely authentic - high confidence in genuineness"
}
```

### Translation Result
```json
{
  "original_text": "The item shows strong indicators of authenticity",
  "translated_text": "该物品显示出强烈的真品指标",
  "source_language": "English",
  "target_language": "Chinese"
}
```

### YOLO Detection Result
```json
{
  "confidence": 0.95,
  "box": [100, 150, 300, 450],
  "classId": 0,
  "pose": {
    "keypoints": [
      {"x": 200, "y": 180},
      {"x": 250, "y": 200}
    ]
  }
}
```

## External API Dependencies

### LLM API
- **Luxury Analysis**: `/api/v1/analyze-image`
- **Fake Goods Detection**: `/api/v1/detect-fake-goods`
- **Streaming Detection**: `/api/v1/detect-fake-goods/stream`
- **Translation**: `/api/v1/translate`

### YOLO API
- **Object Detection**: `/api/v1/detect`

### Segformer API
- **Image Segmentation**: `/api/v1/segment`

## Rate Limiting

No explicit rate limiting is implemented at the API level. Consider implementing rate limiting based on your infrastructure needs.

## CORS Support

All endpoints include CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods`: Varies by endpoint
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200 OK`: Successful operation
- `400 Bad Request`: Invalid input or validation error
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

## Database Schema

### Analysis Table
```sql
CREATE TABLE analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  visibility TEXT CHECK (visibility IN ('private', 'public')) DEFAULT 'private',
  ai_confidence DECIMAL(5,4),
  ai_result_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Analysis Detail Table
```sql
CREATE TABLE analysis_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analysis(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  ai_confidence DECIMAL(5,4) NOT NULL,
  ai_result_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Storage

Images are stored in Supabase Storage:
- **Bucket**: `analysis-images`
- **Structure**: `{user_id}/{timestamp}.{extension}` for uploads
- **Segments**: `{analysis_id}/segment_{index}_{timestamp}.png` for analysis segments

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Role-based access control (admin vs regular users)
3. **File Validation**: Type and size checks for uploads
4. **Storage Security**: Secure file storage with proper access controls
5. **Input Sanitization**: All inputs are validated and sanitized

## Performance Considerations

1. **Streaming**: Real-time progress updates for long-running analysis
2. **Pagination**: Efficient data retrieval with configurable page sizes
3. **File Size Limits**: 10MB maximum for image uploads
4. **Async Processing**: Non-blocking analysis pipeline
5. **Fallback Mechanisms**: Graceful degradation when external APIs fail
