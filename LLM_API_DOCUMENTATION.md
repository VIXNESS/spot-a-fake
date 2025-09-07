# OpenRouter Service - RESTful API Documentation

A FastAPI service for OpenRouter integration with advanced image analysis capabilities, including luxury fashion brand detection, fake goods authentication, and Google image search.

## Table of Contents
- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Request/Response Models](#requestresponse-models)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [Rate Limits](#rate-limits)
- [HTTP Streaming](#-http-streaming-analysis)

## Overview

The OpenRouter Service provides AI-powered image analysis capabilities through a RESTful API built with FastAPI. It integrates with OpenRouter's AI models for sophisticated image understanding and Google Custom Search for image retrieval.

### Key Features
- 🔍 **Luxury Fashion Brand Detection** - Identify luxury brands and products in images
- 🛡️ **Fake Goods Authentication** - Analyze product authenticity with detailed assessments
- 🌊 **Real-time Streaming** - HTTP streaming support with Server-Sent Events (SSE) for live analysis
- 🌐 **Text Translation** - Translate English to Chinese with social media styling using DeepSeek AI
- 🖼️ **Google Image Search** - Search and retrieve images with customizable parameters
- ⚡ **Async Support** - High-performance asynchronous processing
- 📊 **Health Monitoring** - Built-in health check and status endpoints
- 🔧 **Modern Architecture** - Built with FastAPI, Pydantic, and modern Python practices

## Base URL

```
http://localhost:8500
```

## Authentication

The service requires an OpenRouter API key for image analysis endpoints. Set the following environment variable:

```bash
export OPENROUTER_API_KEY="your_api_key_here"
```

## API Endpoints

### Service Information

#### GET `/`
Returns basic service information.

**Response:**
```json
{
  "name": "OpenRouter Service",
  "version": "0.1.0",
  "description": "A FastAPI service for OpenRouter integration with image analysis"
}
```

#### GET `/health`
Health check endpoint for monitoring service status.

**Response:**
```json
{
  "status": "healthy",
  "message": "OpenRouter Service is running"
}
```

#### GET `/api/v1/status`
Detailed API status with available endpoints and features.

**Response:**
```json
{
  "api_version": "v1",
  "status": "operational",
  "endpoints": [
    "/",
    "/health",
    "/api/v1/status",
    "/api/v1/analyze-image",
    "/api/v1/detect-fake-goods",
    "/api/v1/detect-fake-goods/stream",
    "/api/v1/translate",
    "/api/v1/search-images (GET & POST)"
  ],
  "features": {
    "image_analysis": {
      "endpoint": "/api/v1/analyze-image",
      "description": "Analyze uploaded image for luxury fashion brand detection",
      "method": "POST",
      "input": "Multipart form data with image file"
    },
    "fake_goods_detection": {
      "endpoint": "/api/v1/detect-fake-goods",
      "description": "Analyze goods authenticity with detailed assessment",
      "method": "POST",
      "input": "JSON with base64 image and brand name"
    },
    "text_translation": {
      "endpoint": "/api/v1/translate",
      "description": "Translate text from English to Chinese using DeepSeek AI",
      "method": "POST",
      "input": "JSON with text and optional language specifications"
    },
    "image_search": {
      "GET /api/v1/search-images": "Search with query parameters",
      "POST /api/v1/search-images": "Search with JSON request body"
    }
  }
}
```

### Image Analysis

#### POST `/api/v1/analyze-image`
Analyzes an uploaded image to detect luxury fashion brands and products.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:** Image file (JPEG, PNG, etc.)

**Parameters:**
- `file` (required): Image file to analyze

**Response:**
```json
{
  "confident": 0.85,
  "brand": "Gucci",
  "product": "Handbag"
}
```

**Response Fields:**
- `confident` (float): Confidence score between 0.0 and 1.0
- `brand` (string|null): Detected luxury brand name
- `product` (string|null): Detected product type

**Example cURL:**
```bash
curl -X POST "http://localhost:8500/api/v1/analyze-image" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/image.jpg"
```

### Fake Goods Detection

#### POST `/api/v1/detect-fake-goods`
Analyzes goods in an image to determine authenticity with detailed assessment.

#### POST `/api/v1/detect-fake-goods/stream` 🌊
**Real-time streaming analysis** using Server-Sent Events (SSE) for live fake goods detection.

**Standard Analysis Request:**
- **Content-Type:** `application/json`
- **Body:**
```json
{
  "image_base64": "base64_encoded_image_data",
  "brand_name": "Gucci"
}
```

**Parameters:**
- `image_base64` (required): Base64-encoded image data
- `brand_name` (required): Brand name for authentication analysis

**Standard Response:**
```json
{
  "authentic_probability": 0.75,
  "confidence_level": "high",
  "key_findings": [
    "Logo typography matches authentic standards",
    "Stitching quality appears consistent with genuine products",
    "Hardware details show proper finish and weight"
  ],
  "red_flags": [
    "Minor inconsistency in logo spacing"
  ],
  "authentic_indicators": [
    "Correct color saturation and material texture",
    "Proper serial number format and placement"
  ],
  "overall_assessment": "Based on the analysis of multiple factors including logo accuracy, material quality, and construction details, this item shows strong indicators of authenticity with only minor inconsistencies that could be attributed to manufacturing variations.",
  "recommendation": "Likely authentic - proceed with confidence"
}
```

**Response Fields:**
- `authentic_probability` (float): Probability of authenticity (0.0-1.0)
- `confidence_level` (string): Assessment confidence ("low", "medium", "high")
- `key_findings` (array): Important observations from the analysis
- `red_flags` (array): Suspicious elements suggesting counterfeit
- `authentic_indicators` (array): Elements supporting authenticity
- `overall_assessment` (string): Comprehensive analysis summary
- `recommendation` (string): Action recommendation

**Example cURL:**
```bash
curl -X POST "http://localhost:8500/api/v1/detect-fake-goods" \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "brand_name": "Louis Vuitton"
  }'
```

---

### 🌊 HTTP Streaming Analysis

#### POST `/api/v1/detect-fake-goods/stream`
**Real-time streaming fake goods analysis** using Server-Sent Events (SSE). This endpoint provides live analysis updates as the AI processes the image, allowing for real-time user feedback and progressive analysis results.

**Streaming Request:**
- **Content-Type:** `application/json`
- **Body:** Same as standard endpoint
```json
{
  "image_base64": "base64_encoded_image_data",
  "brand_name": "Gucci"
}
```

**Streaming Response:**
- **Content-Type:** `text/event-stream`
- **Headers:**
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `Content-Type: text/event-stream`

**Response Format (Server-Sent Events):**
```
data: {"choices":[{"delta":{"content":"Analyzing the image for "}}]}

data: {"choices":[{"delta":{"content":"Gucci authenticity indicators..."}}]}

data: {"choices":[{"delta":{"content":" The logo typography appears "}}]}

data: {"choices":[{"delta":{"content":"consistent with authentic standards."}}]}

data: [DONE]
```

**Stream Event Structure:**
Each chunk follows the SSE format:
- Events prefixed with `data: `
- JSON structure containing AI analysis chunks
- `[DONE]` marker indicates stream completion
- Real-time content delivered as AI processes the image

**Key Benefits:**
- 🚀 **Real-time feedback** - See analysis progress as it happens
- 📱 **Better UX** - Progressive loading for mobile/web apps
- ⚡ **Lower latency** - First response chunks arrive immediately
- 🔄 **Live updates** - Stream analysis reasoning in real-time

**Example cURL (Streaming):**
```bash
curl -X POST "http://localhost:8500/api/v1/detect-fake-goods/stream" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "brand_name": "Chanel"
  }'
```

**JavaScript Example (EventSource):**
```javascript
// Prepare the request data
const requestData = {
  image_base64: "base64_encoded_image_data",
  brand_name: "Louis Vuitton"
};

// Create EventSource for streaming
const eventSource = new EventSource('/api/v1/detect-fake-goods/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestData)
});

// Handle streaming data
eventSource.onmessage = function(event) {
  if (event.data === '[DONE]') {
    eventSource.close();
    console.log('Analysis complete');
    return;
  }
  
  try {
    const data = JSON.parse(event.data);
    const content = data.choices?.[0]?.delta?.content;
    if (content) {
      // Display real-time analysis content
      document.getElementById('analysis-output').innerHTML += content;
    }
  } catch (e) {
    console.error('Error parsing stream data:', e);
  }
};

eventSource.onerror = function(event) {
  console.error('Stream error:', event);
  eventSource.close();
};
```

**Python Client Example (Streaming):**
```python
import requests
import json

def stream_fake_goods_analysis(image_base64, brand_name):
    url = "http://localhost:8500/api/v1/detect-fake-goods/stream"
    
    payload = {
        "image_base64": image_base64,
        "brand_name": brand_name
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }
    
    response = requests.post(url, json=payload, headers=headers, stream=True)
    
    if response.status_code == 200:
        for line in response.iter_lines(decode_unicode=True):
            if line.startswith('data: '):
                data = line[6:]  # Remove 'data: ' prefix
                
                if data.strip() == '[DONE]':
                    print("\\nAnalysis complete")
                    break
                    
                try:
                    parsed = json.loads(data)
                    content = parsed.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if content:
                        print(content, end="", flush=True)
                except json.JSONDecodeError:
                    pass
    else:
        print(f"Error: {response.status_code} - {response.text}")

# Usage
stream_fake_goods_analysis("base64_image_data", "Hermès")
```

### Text Translation

#### POST `/api/v1/translate`
Translates text from English to Chinese using DeepSeek AI with social media styling (小红书 style).

**Request:**
- **Content-Type:** `application/json`
- **Body:**
```json
{
  "text": "This amazing designer handbag features premium leather and exquisite craftsmanship.",
  "source_language": "English",
  "target_language": "Chinese"
}
```

**Parameters:**
- `text` (required): Text to translate (max 5000 characters)
- `source_language` (optional): Source language (default: "English")  
- `target_language` (optional): Target language (default: "Chinese")

**Response:**
```json
{
  "original_text": "This amazing designer handbag features premium leather and exquisite craftsmanship.",
  "translated_text": "「这款绝美设计师手袋真的太棒了！💯 采用优质皮革，工艺精湛到让人惊叹～✨ 谁懂啊家人们，这就是传说中的质感天花板！🎯 #奢华单品 #品质生活 #种草必备 #时尚达人」",
  "source_language": "English",
  "target_language": "Chinese"
}
```

**Response Fields:**
- `original_text` (string): The original input text
- `translated_text` (string): Translated text with social media styling and emojis
- `source_language` (string): Source language used
- `target_language` (string): Target language used

**Features:**
- 🎯 **Social Media Style**: Optimized for 小红书 (Xiaohongshu) platform
- ✨ **Emoji Integration**: Automatic emoji insertion for engagement
- 🏷️ **Smart Hashtags**: Relevant hashtag generation (3-5 tags)
- 🗣️ **Natural Language**: Uses popular internet slang and expressions

**Example cURL:**
```bash
curl -X POST "http://localhost:8500/api/v1/translate" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Check out this luxury watch collection",
    "source_language": "English",
    "target_language": "Chinese"
  }'
```

### Image Search

#### GET `/api/v1/search-images`
Search for images using query parameters.

**Parameters:**
- `query` (required): Search query string
- `num_results` (optional): Number of results to return (default: 10)
- `safe_search` (optional): Safe search setting ("active", "off") (default: "active")

**Response:**
```json
{
  "query": "luxury handbags",
  "num_results": 5,
  "total_requested": 10,
  "results": [
    {
      "title": "Designer Handbag Collection",
      "link": "https://example.com/image1.jpg",
      "displayLink": "example.com",
      "snippet": "Luxury designer handbags...",
      "image": {
        "contextLink": "https://example.com/product-page",
        "height": 400,
        "width": 600,
        "byteSize": 45231,
        "thumbnailLink": "https://example.com/thumb1.jpg",
        "thumbnailHeight": 120,
        "thumbnailWidth": 180
      }
    }
  ]
}
```

**Example cURL:**
```bash
curl "http://localhost:8500/api/v1/search-images?query=designer%20shoes&num_results=5&safe_search=active"
```

#### POST `/api/v1/search-images`
Search for images using JSON request body.

**Request:**
- **Content-Type:** `application/json`
- **Body:**
```json
{
  "query": "vintage watches",
  "num_results": 10,
  "safe_search": "active"
}
```

**Response:** Same format as GET endpoint

**Example cURL:**
```bash
curl -X POST "http://localhost:8500/api/v1/search-images" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "luxury watches",
    "num_results": 15,
    "safe_search": "active"
  }'
```

## Request/Response Models

### LuxuryFashionAnalysis
```python
{
  "confident": float,      # 0.0 to 1.0
  "brand": str | null,     # Brand name or null
  "product": str | null    # Product type or null
}
```

### FakeGoodsDetectionRequest
```python
{
  "image_base64": str,     # Base64-encoded image
  "brand_name": str        # Brand name for analysis
}
```

### FakeGoodsDetectionResponse
```python
{
  "authentic_probability": float,    # 0.0 to 1.0
  "confidence_level": str,           # "low", "medium", "high"
  "key_findings": List[str],         # Important observations
  "red_flags": List[str],            # Suspicious elements
  "authentic_indicators": List[str], # Supporting evidence
  "overall_assessment": str,         # Detailed summary
  "recommendation": str              # Action recommendation
}
```

### TranslationRequest
```python
{
  "text": str,                  # Text to translate (required)
  "source_language": str,      # Source language (default: "English")
  "target_language": str       # Target language (default: "Chinese")
}
```

### TranslationResponse
```python
{
  "original_text": str,        # Original input text
  "translated_text": str,      # Translated text with styling
  "source_language": str,      # Source language used
  "target_language": str       # Target language used
}
```

### ImageSearchRequest
```python
{
  "query": str,           # Search query
  "num_results": int,     # Number of results (default: 10)
  "safe_search": str      # "active" or "off" (default: "active")
}
```

### ImageSearchResponse
```python
{
  "query": str,                    # Original query
  "num_results": int,              # Actual results returned
  "total_requested": int,          # Number requested
  "results": List[Dict]            # Search results
}
```

## Error Handling

The API uses standard HTTP status codes and returns detailed error messages:

### Common Error Responses

#### 400 Bad Request
```json
{
  "detail": "File must be an image"
}
```

#### 401 Unauthorized
```json
{
  "detail": "API key not configured"
}
```

#### 500 Internal Server Error
```json
{
  "detail": "Internal error: Connection timeout"
}
```

### Error Status Codes
- `400` - Bad Request (invalid input, wrong file type)
- `401` - Unauthorized (missing or invalid API key)
- `422` - Unprocessable Entity (validation errors)
- `500` - Internal Server Error (processing failures, API errors)

## Examples

### Complete Workflow Example

1. **Check Service Health:**
```bash
curl http://localhost:8500/health
```

2. **Analyze Image for Luxury Brands:**
```bash
curl -X POST "http://localhost:8500/api/v1/analyze-image" \
  -F "file=@designer_bag.jpg"
```

3. **Authenticate Product (Standard):**
```bash
# First, encode your image to base64
IMAGE_BASE64=$(base64 -w 0 product_image.jpg)

curl -X POST "http://localhost:8500/api/v1/detect-fake-goods" \
  -H "Content-Type: application/json" \
  -d "{
    \"image_base64\": \"$IMAGE_BASE64\",
    \"brand_name\": \"Chanel\"
  }"
```

4. **Authenticate Product (Streaming):**
```bash
# Stream real-time analysis
curl -X POST "http://localhost:8500/api/v1/detect-fake-goods/stream" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d "{
    \"image_base64\": \"$IMAGE_BASE64\",
    \"brand_name\": \"Chanel\"
  }"
```

5. **Translate Product Description:**
```bash
curl -X POST "http://localhost:8500/api/v1/translate" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This authentic Chanel bag features premium quilted leather and gold-tone hardware."
  }'
```

6. **Search for Similar Images:**
```bash
curl "http://localhost:8500/api/v1/search-images?query=chanel%20bag&num_results=10"
```

### Python Client Example

```python
import requests
import base64

# Service base URL
BASE_URL = "http://localhost:8500"

# Analyze image for luxury brands
def analyze_luxury_image(image_path):
    with open(image_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(f"{BASE_URL}/api/v1/analyze-image", files=files)
    return response.json()

# Detect fake goods (Standard)
def detect_fake_goods(image_path, brand_name):
    with open(image_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode()
    
    payload = {
        "image_base64": image_data,
        "brand_name": brand_name
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/detect-fake-goods", json=payload)
    return response.json()

# Detect fake goods (Streaming)
def detect_fake_goods_stream(image_path, brand_name):
    with open(image_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode()
    
    payload = {
        "image_base64": image_data,
        "brand_name": brand_name
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/detect-fake-goods/stream", 
                           json=payload, headers=headers, stream=True)
    
    # Process streaming response
    full_analysis = ""
    for line in response.iter_lines(decode_unicode=True):
        if line.startswith('data: '):
            data = line[6:]  # Remove 'data: ' prefix
            
            if data.strip() == '[DONE]':
                break
                
            try:
                parsed = json.loads(data)
                content = parsed.get("choices", [{}])[0].get("delta", {}).get("content", "")
                if content:
                    full_analysis += content
                    print(content, end="", flush=True)
            except json.JSONDecodeError:
                pass
    
    return full_analysis

# Translate text
def translate_text(text, source_language="English", target_language="Chinese"):
    payload = {
        "text": text,
        "source_language": source_language,
        "target_language": target_language
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/translate", json=payload)
    return response.json()

# Search images
def search_images(query, num_results=10):
    params = {
        "query": query,
        "num_results": num_results,
        "safe_search": "active"
    }
    
    response = requests.get(f"{BASE_URL}/api/v1/search-images", params=params)
    return response.json()

# Usage examples
if __name__ == "__main__":
    # Analyze a luxury item
    result = analyze_luxury_image("handbag.jpg")
    print(f"Brand: {result['brand']}, Confidence: {result['confident']}")
    
    # Check authenticity (Standard)
    auth_result = detect_fake_goods("product.jpg", "Gucci")
    print(f"Authentic probability: {auth_result['authentic_probability']}")
    
    # Check authenticity (Streaming) - Real-time analysis
    print("Streaming analysis:")
    stream_result = detect_fake_goods_stream("product.jpg", "Gucci")
    print(f"\n\nComplete analysis: {len(stream_result)} characters")
    
    # Translate product description
    translation_result = translate_text("This luxury handbag is made from premium Italian leather")
    print(f"Translation: {translation_result['translated_text']}")
    
    # Search for similar images
    search_result = search_images("luxury watches", 5)
    print(f"Found {search_result['num_results']} images")
```

## Rate Limits

Currently, the service does not implement rate limiting, but consider the following:

- **OpenRouter API**: Subject to OpenRouter's rate limits and pricing
- **DeepSeek API**: Subject to DeepSeek's rate limits and pricing for translation services
- **Google Custom Search**: Limited by Google's API quotas (100 searches/day free tier)
- **File Upload**: Maximum file size depends on server configuration
- **Translation Text**: Limited to 5000 characters per request
- **Streaming Endpoints**: Use Server-Sent Events (SSE) - connections stay open during analysis, consider connection limits

## Development & Deployment

### Local Development
```bash
# Install dependencies
pip install -e .

# Set environment variables
export OPENROUTER_API_KEY="your_key_here"

# Run development server
uvicorn main:app --host 0.0.0.0 --port 8500 --reload
```

### Production Deployment
```bash
# Run with Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8500 --workers 4

# Or use the provided script
chmod +x run_server.sh
./run_server.sh
```

### Interactive API Documentation

Once running, access the interactive documentation:
- **Swagger UI**: http://localhost:8500/docs
- **ReDoc**: http://localhost:8500/redoc

## Support

For issues, questions, or feature requests, please refer to the project repository or contact the development team.

---

**Service Version:** 0.1.0  
**API Version:** v1  
**Last Updated:** 2024
