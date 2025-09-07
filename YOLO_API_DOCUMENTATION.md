# Spot a Fake AI - API Documentation

## Overview

The Spot a Fake AI API is a FastAPI-based service that provides object detection and pose estimation capabilities using YOLOv11 models. The API can detect objects in images and perform pose estimation for human subjects. The service uses modern async/await patterns with lifespan management for efficient resource handling.

## Base Information

- **Title**: Spot a Fake AI
- **Version**: 1.0.0
- **Base URL**: `http://localhost:8000` (default development)
- **API Prefix**: `/api/v1`

## Authentication

Currently, no authentication is required for API access.

## Content Types

- **Request**: `multipart/form-data` (for file uploads)
- **Response**: `application/json`

---

## Endpoints

### Health Check

#### `GET /healthcheck`

Health check endpoint for monitoring service availability.

**Response:**
```json
{
  "status": "ok"
}
```

**Status Codes:**
- `200 OK`: Service is healthy

---

### Object Detection

#### `POST /api/v1/detect`

Detect objects in an uploaded image using YOLO models. For human subjects, also performs pose estimation.

**Request:**

- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file` (required): Image file to analyze
    - **Type**: File upload
    - **Formats**: Any image format (JPEG, PNG, etc.)
    - **Max Size**: 10MB
    - **Content-Type**: Must start with `image/`

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/detect" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@image.jpg"
```

**Response Schema:**

```json
{
  "success": true,
  "filename": "string",
  "detections": [
    {
      "confidence": 0.85,
      "box": [x1, y1, x2, y2],
      "type": "person",
      "class_id": 0,
      "pose": {
        "keypoints": {
          "xy": [[x1, y1], [x2, y2], ...]
        }
      }
    }
  ],
  "count": 1
}
```

**Response Fields:**

- `success` (boolean): Indicates if the request was successful
- `filename` (string): Name of the uploaded file
- `detections` (array): List of detected objects
  - `confidence` (float): Detection confidence score (0.0 - 1.0)
  - `box` (array): Bounding box coordinates [x1, y1, x2, y2]
  - `type` (string): Object class name (e.g., "person", "car", etc.)
  - `class_id` (integer): YOLO class identifier
  - `pose` (object|null): Pose keypoints (only for human detections with class_id=0)
    - `keypoints` (object): Pose keypoint coordinates
      - `xy` (array): Array of [x, y] coordinate pairs for 17 body keypoints in COCO format

**Status Codes:**
- `200 OK`: Detection completed successfully
- `400 Bad Request`: Invalid file or validation error
- `422 Unprocessable Entity`: Request validation failed
- `500 Internal Server Error`: Model inference or processing error

---

## Data Models

### DetectionResult

Represents a single object detection result.

```json
{
  "confidence": 0.85,
  "box": [100, 200, 300, 400],
  "type": "person",
  "class_id": 0,
  "pose": {
    "keypoints": {
      "xy": [[150, 220], [160, 210], ...]
    }
  }
}
```

### PoseResult

Represents pose estimation keypoints for human subjects using COCO format (17 keypoints).

```json
{
  "keypoints": {
    "xy": [
      [nose_x, nose_y],           // 0: nose
      [left_eye_x, left_eye_y],   // 1: left_eye  
      [right_eye_x, right_eye_y], // 2: right_eye
      [left_ear_x, left_ear_y],   // 3: left_ear
      [right_ear_x, right_ear_y], // 4: right_ear
      [left_shoulder_x, left_shoulder_y],   // 5: left_shoulder
      [right_shoulder_x, right_shoulder_y], // 6: right_shoulder
      [left_elbow_x, left_elbow_y],         // 7: left_elbow
      [right_elbow_x, right_elbow_y],       // 8: right_elbow
      [left_wrist_x, left_wrist_y],         // 9: left_wrist
      [right_wrist_x, right_wrist_y],       // 10: right_wrist
      [left_hip_x, left_hip_y],             // 11: left_hip
      [right_hip_x, right_hip_y],           // 12: right_hip
      [left_knee_x, left_knee_y],           // 13: left_knee
      [right_knee_x, right_knee_y],         // 14: right_knee
      [left_ankle_x, left_ankle_y],         // 15: left_ankle
      [right_ankle_x, right_ankle_y]        // 16: right_ankle
    ]
  }
}
```

**Note**: Pose estimation is only performed for detected humans (class_id=0) and requires cropping the detected person from the original image before pose analysis.

---

## Technical Implementation

### Request Processing Pipeline

1. **HTTP Middleware**: Logs all incoming requests with timing
2. **File Validation**: Checks content type and file size (max 10MB)
3. **Image Processing**: Converts uploaded file to PIL Image
4. **Object Detection**: YOLO detection model inference
5. **Human Pose Analysis**: For detected humans (class_id=0), crops the bounding box and runs pose estimation
6. **Response Assembly**: Combines detection and pose data into JSON response

### Async Architecture

The application uses modern async/await patterns:

- **Lifespan Management**: Models loaded once at startup, cleaned up at shutdown
- **Semaphore-based Concurrency**: Limits concurrent model inferences
- **Thread Pool Execution**: CPU-intensive model inference runs in dedicated threads
- **Non-blocking I/O**: File uploads and image processing use async operations

### Model Loading Strategy

Models are loaded during application startup to avoid cold-start latency:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load models once
    app.state.yolo_detection_manager = YOLODetectionInferenceService(max_concurrent=3)
    app.state.yolo_pose_manager = YOLOPoseInferenceService(max_concurrent=3)
    yield
    # Shutdown: Clean up resources
    app.state.yolo_detection_manager.executor.shutdown(wait=True)
    app.state.yolo_pose_manager.executor.shutdown(wait=True)
```

---

## Error Handling

The API uses structured error responses with consistent formatting:

### Error Response Schema

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": "Additional error details (optional)",
  "status_code": 400
}
```

### Error Types

#### File Validation Errors (400 Bad Request)

Returned when uploaded file fails validation.

```json
{
  "success": false,
  "error": "File validation failed",
  "message": "File must be an image. Received: application/pdf",
  "filename": "document.pdf"
}
```

**Common Causes:**
- File is not an image format
- File size exceeds 10MB limit
- Missing or invalid content type

#### Image Processing Errors (400 Bad Request)

Returned when image processing fails.

```json
{
  "success": false,
  "error": "Image processing failed",
  "message": "Failed to process image file",
  "details": "Cannot identify image file"
}
```

**Common Causes:**
- Corrupted image file
- Unsupported image format
- Invalid image data

#### Model Inference Errors (500 Internal Server Error)

Returned when YOLO model inference fails.

```json
{
  "success": false,
  "error": "Model inference failed",
  "message": "YOLO detection failed: CUDA out of memory",
  "model_type": "detection"
}
```

**Common Causes:**
- GPU memory exhaustion
- Model loading issues
- Invalid model configuration

#### Validation Errors (422 Unprocessable Entity)

Returned when request parameters fail validation.

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "loc": ["body", "file"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ],
  "message": "Please check your request parameters"
}
```

#### Internal Server Errors (500 Internal Server Error)

Returned for unexpected server errors.

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later.",
  "request_id": "req_12345"
}
```

---

## Configuration

### Model Configuration

The API uses the following YOLOv11 models:

- **Detection Model**: `./models/yolo11x.pt` (YOLOv11 Extra Large)
- **Pose Model**: `./models/yolo11x-pose.pt` (YOLOv11 Extra Large Pose)

### Confidence Thresholds

- **Human Detection**: 0.8 (80%) - Applied to both detection and pose estimation
- **Object Detection**: 0.6 (60%) - Applied to non-human objects

### Concurrency Limits

- **Max Concurrent Requests**: 3 per model type (detection and pose)
- **Thread Pool Size**: 3 workers per model type
- **Total Thread Pool Workers**: 6 (3 for detection + 3 for pose)
- **Service Initialization**: Uses asyncio semaphores for request limiting

### Application Lifecycle

The application uses FastAPI's lifespan management for efficient resource handling:

**Startup Sequence:**
1. Logger initialization with rotating file handler
2. YOLO detection model loading (`YOLODetectionInferenceService`)
3. YOLO pose model loading (`YOLOPoseInferenceService`)
4. Thread pool and semaphore initialization for each model
5. Service becomes ready to accept requests

**Shutdown Sequence:**
1. Graceful shutdown signal received
2. Thread pool executors shutdown with wait=True
3. Model resources cleanup
4. Logger cleanup

### Project Dependencies

The project uses UV for dependency management with the following core dependencies:

```toml
fastapi>=0.116.1          # Web framework
python-multipart>=0.0.20  # File upload support  
ultralytics>=8.3.186      # YOLO models
uvicorn>=0.35.0           # ASGI server
jupyterlab>=4.4.6         # Development notebook support
```

---

## Examples

### Successful Detection Response

```json
{
  "success": true,
  "filename": "family_photo.jpg",
  "detections": [
    {
      "confidence": 0.92,
      "box": [150, 100, 350, 450],
      "type": "person",
      "class_id": 0,
      "pose": {
        "keypoints": {
          "xy": [
            [250, 120],  // nose
            [240, 110],  // left_eye
            [260, 110],  // right_eye
            [230, 115],  // left_ear
            [270, 115],  // right_ear
            [220, 140],  // left_shoulder
            [280, 140],  // right_shoulder
            [210, 180],  // left_elbow
            [290, 180],  // right_elbow
            [200, 220],  // left_wrist
            [300, 220],  // right_wrist
            [230, 200],  // left_hip
            [270, 200],  // right_hip
            [225, 280],  // left_knee
            [275, 280],  // right_knee
            [220, 360],  // left_ankle
            [280, 360]   // right_ankle
          ]
        }
      }
    },
    {
      "confidence": 0.78,
      "box": [400, 200, 500, 350],
      "type": "bicycle",
      "class_id": 1,
      "pose": null
    }
  ],
  "count": 2
}
```

### File Validation Error

```json
{
  "success": false,
  "error": "File validation failed",
  "message": "File size too large. Maximum allowed: 10MB",
  "filename": "large_image.jpg"
}
```

---

## Rate Limiting

No explicit rate limiting is implemented. However, throughput is naturally limited by:

- Maximum 3 concurrent inference requests per model type (detection/pose)
- ThreadPoolExecutor with 3 workers per model type
- Asyncio semaphores managing request queuing
- Model inference time (varies based on image size and complexity)

---

## Logging

The API provides comprehensive logging with dual output streams:

- **Console Logs**: Simplified format for development monitoring
  ```
  2024-01-15 10:30:45 - INFO - main.py:289 - Incoming request: POST /api/v1/detect
  ```

- **File Logs**: Detailed format with rotation and full context
  ```
  2024-01-15 10:30:45 - spot-a-fake-ai - INFO - main.py:289 - detect() - Incoming request: POST /api/v1/detect
  ```

**Log Configuration:**
- **File Location**: `./logs/app.log`
- **Rotation**: 10MB per file, 5 backup files retained
- **Encoding**: UTF-8
- **Logger Name**: `spot-a-fake-ai`

**Logged Events:**
- Request/response timing and status codes
- File upload validation details
- Model inference performance metrics
- Error conditions with full stack traces
- Application startup/shutdown events

---

## Development

### Running the API

```bash
# Install dependencies using UV (recommended)
uv sync

# Run development server (recommended)
./run_dev.sh

# Or run manually with UV
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Alternative: Install with pip (not recommended)
pip install fastapi>=0.116.1 python-multipart>=0.0.20 ultralytics>=8.3.186 uvicorn>=0.35.0 jupyterlab>=4.4.6
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Testing the API

```bash
# Health check
curl http://localhost:8000/healthcheck

# Object detection
curl -X POST "http://localhost:8000/api/v1/detect" \
  -H "accept: application/json" \
  -F "file=@test_image.jpg"

# Object detection with verbose output
curl -X POST "http://localhost:8000/api/v1/detect" \
  -H "accept: application/json" \
  -F "file=@test_image.jpg" | jq '.'
```

---

## Support

### Troubleshooting

**Common Issues:**

1. **Model Loading Errors**
   - Ensure `./models/yolo11x.pt` and `./models/yolo11x-pose.pt` exist
   - Check file permissions on model files
   - Verify sufficient disk space and memory

2. **File Upload Issues**
   - Confirm file is a valid image format (JPEG, PNG, etc.)
   - Check file size is under 10MB limit
   - Verify proper `multipart/form-data` encoding

3. **Performance Issues**
   - Monitor concurrent request limits (3 per model type)
   - Check system memory usage during inference
   - Review log files for processing time metrics

**Debugging Information:**

- **Application Logs**: `./logs/app.log` (detailed error information)
- **Health Check**: `GET /healthcheck` (service availability)
- **Log Level**: INFO (includes request timing and model performance)

**Log Analysis:**

```bash
# Monitor real-time logs
tail -f ./logs/app.log

# Search for errors
grep "ERROR" ./logs/app.log

# Check inference timing
grep "Detection completed" ./logs/app.log
```

### API Development

For development and testing, the API includes:

- Comprehensive error handling with structured responses
- Request/response logging middleware
- Graceful shutdown handling
- Resource cleanup on application exit

The service is designed to handle production workloads with proper error recovery and resource management.
