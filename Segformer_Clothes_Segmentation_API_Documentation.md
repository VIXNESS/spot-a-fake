# Segformer Clothes Segmentation API Documentation

## Overview

The Segformer Clothes Segmentation API is a RESTful web service that provides semantic segmentation of clothing items in images using the Segformer B2 model. The API can identify and segment 18 different clothing and body part categories with high accuracy.

## Base Information

- **Title**: Segformer Clothes Segmentation API
- **Version**: 1.0.0
- **Base URL**: `http://localhost:8100`
- **Framework**: FastAPI
- **Model**: Segformer B2 (mattmdjaga/segformer_b2_clothes)

## Features

- Real-time clothing segmentation
- Support for 18 clothing/body part categories
- Hole filling using morphological operations
- Thread-safe concurrent processing
- GPU acceleration (CUDA) when available
- Base64 encoded mask outputs for easy integration

## Supported Labels

The API can detect and segment the following 18 categories:

| ID | Label | Description |
|----|-------|-------------|
| 0 | Background | Image background |
| 1 | Hat | Headwear |
| 2 | Hair | Human hair |
| 3 | Sunglasses | Eyewear |
| 4 | Upper-clothes | Shirts, jackets, tops |
| 5 | Skirt | Skirts |
| 6 | Pants | Trousers, jeans |
| 7 | Dress | Dresses |
| 8 | Belt | Belts |
| 9 | Left-shoe | Left footwear |
| 10 | Right-shoe | Right footwear |
| 11 | Face | Human face |
| 12 | Left-leg | Left leg |
| 13 | Right-leg | Right leg |
| 14 | Left-arm | Left arm |
| 15 | Right-arm | Right arm |
| 16 | Bag | Bags, purses |
| 17 | Scarf | Scarves |

## API Endpoints

### 1. Root Endpoint

**GET** `/`

Returns basic API information and available endpoints.

#### Response

```json
{
  "message": "Segformer Clothes Segmentation API",
  "version": "1.0.0",
  "endpoints": {
    "/segment": "POST - Upload image for segmentation",
    "/labels": "GET - Get available clothing labels",
    "/health": "GET - Health check"
  }
}
```

### 2. Health Check

**GET** `/health`

Checks the health status of the API and model.

#### Response

```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cuda:0",
  "cuda_available": true,
  "thread_pool_active": true
}
```

#### Response Fields

- `status`: Overall API status
- `model_loaded`: Whether the segmentation model is loaded
- `device`: Current compute device (CPU/CUDA)
- `cuda_available`: CUDA availability status
- `thread_pool_active`: Thread pool executor status

### 3. Get Labels

**GET** `/api/v1/labels`

Returns all available clothing labels and their IDs.

#### Response

```json
{
  "labels": {
    "0": "Background",
    "1": "Hat",
    "2": "Hair",
    // ... all 18 labels
  },
  "total_labels": 18
}
```

### 4. Image Segmentation

**POST** `/api/v1/segment`

Performs semantic segmentation on an uploaded image.

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file` | File | Yes | - | Image file to segment (JPEG, PNG, etc.) |
| `include_individual_masks` | Boolean | No | `true` | Generate individual masks for each item |
| `fill_holes` | Boolean | No | `true` | Apply morphological hole filling |

#### Content-Type

`multipart/form-data`

#### Example Request (cURL)

```bash
curl -X POST "http://localhost:8100/api/v1/segment" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@image.jpg" \
  -F "include_individual_masks=true" \
  -F "fill_holes=true"
```

#### Example Request (Python)

```python
import requests

url = "http://localhost:8100/api/v1/segment"
files = {"file": open("image.jpg", "rb")}
data = {
    "include_individual_masks": True,
    "fill_holes": True
}

response = requests.post(url, files=files, data=data)
result = response.json()
```

#### Response

```json
{
  "filename": "image.jpg",
  "image_size": [800, 600],
  "segmentation_result": {
    "mask_shape": [600, 800],
    "combined_mask": {
      "mask_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
      "description": "Combined mask with all clothing items (holes filled)"
    },
    "detected_items": [
      {
        "label": "Upper-clothes",
        "label_id": 4,
        "percentage": 15.23
      },
      {
        "label": "Pants",
        "label_id": 6,
        "percentage": 12.45
      }
    ],
    "total_labels_detected": 2
  }
}
```

#### Response Fields

- `filename`: Original filename of uploaded image
- `image_size`: Original image dimensions [width, height]
- `segmentation_result`: Segmentation analysis results
  - `mask_shape`: Segmentation mask dimensions [height, width]
  - `combined_mask`: Combined segmentation mask
    - `mask_base64`: Base64 encoded PNG image of the mask
    - `description`: Description of the mask
  - `detected_items`: Array of detected clothing items
    - `label`: Human-readable label name
    - `label_id`: Numeric label ID
    - `percentage`: Percentage of image covered by this item
  - `total_labels_detected`: Number of clothing items detected

## Error Responses

The API returns standard HTTP status codes with JSON error messages:

### 400 Bad Request

```json
{
  "detail": "File must be an image"
}
```

### 500 Internal Server Error

```json
{
  "detail": "Error during model inference: <error_message>"
}
```

### 503 Service Unavailable

```json
{
  "detail": "Model not loaded"
}
```

## Usage Examples

### Basic Segmentation

```python
import requests
import base64
from PIL import Image
import io

# Upload image for segmentation
with open("person.jpg", "rb") as f:
    response = requests.post(
        "http://localhost:8100/api/v1/segment",
        files={"file": f}
    )

result = response.json()

# Decode the combined mask
mask_data = base64.b64decode(result["segmentation_result"]["combined_mask"]["mask_base64"])
mask_image = Image.open(io.BytesIO(mask_data))
mask_image.show()

# Print detected items
for item in result["segmentation_result"]["detected_items"]:
    print(f"{item['label']}: {item['percentage']:.2f}%")
```

### Segmentation Without Hole Filling

```python
import requests

with open("person.jpg", "rb") as f:
    response = requests.post(
        "http://localhost:8100/api/v1/segment",
        files={"file": f},
        data={"fill_holes": False}
    )

result = response.json()
```

## Technical Details

### Model Information

- **Architecture**: Segformer B2
- **Input**: RGB images (automatically converted if needed)
- **Output**: Segmentation masks with 18 classes
- **Processing**: Thread-safe with concurrent request handling

### Performance Features

- **GPU Acceleration**: Automatic CUDA detection and usage
- **Thread Pool**: Maximum 4 concurrent inference operations
- **Memory Management**: Efficient tensor operations with proper cleanup
- **Hole Filling**: Advanced morphological operations for mask refinement

### Image Processing Pipeline

1. **Input Validation**: File type and format verification
2. **Preprocessing**: RGB conversion and tensor preparation
3. **Inference**: Segformer model prediction
4. **Postprocessing**: Upsampling and mask generation
5. **Hole Filling**: Optional morphological operations
6. **Output Generation**: Base64 encoding and statistics calculation

## Rate Limiting and Concurrency

- Maximum 4 concurrent inference operations
- Thread-safe model access with mutex locks
- Automatic queuing for excess requests

## Deployment

### Running the Server

```bash
python main.py
```

Server will start on `http://0.0.0.0:8100`

### Production Deployment

```bash
uvicorn main:app --host 0.0.0.0 --port 8100 --workers 1
```

**Note**: Use only 1 worker due to model loading requirements.

### Docker Deployment

```dockerfile
FROM python:3.9
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8100
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100"]
```

## Integration Examples

### JavaScript/Frontend

```javascript
async function segmentImage(imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('fill_holes', 'true');
  
  try {
    const response = await fetch('http://localhost:8100/api/v1/segment', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    // Display results
    console.log('Detected items:', result.segmentation_result.detected_items);
    
    // Show mask image
    const maskImg = document.createElement('img');
    maskImg.src = `data:image/png;base64,${result.segmentation_result.combined_mask.mask_base64}`;
    document.body.appendChild(maskImg);
    
  } catch (error) {
    console.error('Segmentation failed:', error);
  }
}
```

### cURL Examples

```bash
# Basic segmentation
curl -X POST "http://localhost:8100/api/v1/segment" \
  -F "file=@image.jpg"

# With custom parameters
curl -X POST "http://localhost:8100/api/v1/segment" \
  -F "file=@image.jpg" \
  -F "fill_holes=false" \
  -F "include_individual_masks=false"

# Health check
curl -X GET "http://localhost:8100/health"

# Get labels
curl -X GET "http://localhost:8100/api/v1/labels"
```

## Troubleshooting

### Common Issues

1. **Model not loaded**: Ensure the model path is correct and accessible
2. **CUDA errors**: Check GPU memory and CUDA installation
3. **File upload errors**: Verify image format and file size
4. **Memory issues**: Monitor system resources during processing

### Debug Information

Check server logs for detailed error information and performance metrics.

## API Versioning

Current API version is `v1`. Future versions will maintain backward compatibility where possible.

---

*Last updated: Generated from main.py analysis*
