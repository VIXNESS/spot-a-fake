# Text Summarization API

## Overview

The Text Summarization API provides real-time streaming summarization of multiple text inputs using DeepSeek AI. It's specifically designed for authenticity analysis with a Chinese social media style output.

## Endpoint

```
POST /api/v1/summarize-texts/stream
```

## Features

- **Text Merging**: Combines multiple text inputs into a single string
- **Real-time Streaming**: Returns results via Server-Sent Events (SSE)
- **Chinese Social Media Style**: Outputs in Xiaohongshu (Little Red Book) style with emojis and hashtags
- **Authenticity Analysis**: Specialized for product authentication and counterfeit detection
- **Scoring System**: Includes percentage-based scoring and authenticity indicators

## Request Format

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "texts": [
    "First text to summarize...",
    "Second text to summarize...",
    "Third text to summarize..."
  ]
}
```

### Parameters
- `texts` (required): Array of strings to be summarized
  - Must contain at least one non-empty text
  - Maximum total length: 10,000 characters
  - Each text must be non-empty after trimming

## Response Format

### Headers
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### Response Stream
The API returns a Server-Sent Events stream with the following format:

```
data: {"content": "Partial content chunk..."}

data: {"content": "More content..."}

data: [DONE]
```

### Error Response
```
data: {"error": "Error message description"}
```

## Example Usage

### Python Example
```python
import requests
import json

url = "http://localhost:8500/api/v1/summarize-texts/stream"
payload = {
    "texts": [
        "CHANEL Classic Flap Bag - The authentic bag has a hologram sticker...",
        "LOUIS VUITTON Neverfull - Genuine LV bags have date codes...",
        "HERMÈS Birkin Bag - Authentic Birkins have hand-stitched handles..."
    ]
}

response = requests.post(url, json=payload, stream=True)

for line in response.iter_lines(decode_unicode=True):
    if line.startswith("data: "):
        data_str = line[6:]
        if data_str.strip() == "[DONE]":
            break
        try:
            data = json.loads(data_str)
            if "content" in data:
                print(data["content"], end="", flush=True)
        except json.JSONDecodeError:
            pass
```

### JavaScript Example
```javascript
const eventSource = new EventSource('/api/v1/summarize-texts/stream', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        texts: [
            "First authentication text...",
            "Second authentication text...",
            "Third authentication text..."
        ]
    })
});

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.content) {
        console.log(data.content);
    }
};

eventSource.onerror = function(event) {
    console.error('Stream error:', event);
};
```

## Expected Output Style

The API uses a specialized Chinese prompt that produces output in the following style:

```
【真伪鉴定总结小助手】🔥  

CHANEL CF终极鉴定手册👜！
正品镭射标有金粉晕染✨假货印刷呆板
双C扣正品刻字深邃清晰⚡假货激光刻字发白
皮革质感正品柔软有弹性💎假货硬挺无光泽
综合评分：95分💯｜#A货克星 #奢侈品内行 #避雷保命
```

## Error Handling

### Common Error Codes
- `400 Bad Request`: Invalid input (empty texts, too long, etc.)
- `500 Internal Server Error`: Server-side processing error

### Error Response Format
```json
{
  "detail": "Error description"
}
```

## Testing

Use the provided test script to verify the API functionality:

```bash
python test_summarization_api.py
```

Make sure the server is running on `http://localhost:8500` before testing.

## Integration Notes

- The API uses DeepSeek AI for processing
- Streaming responses allow for real-time display of results
- The prompt is specifically designed for Chinese social media style output
- Maximum processing time is typically 30-60 seconds depending on text length
- The API automatically merges multiple texts with double newline separators
