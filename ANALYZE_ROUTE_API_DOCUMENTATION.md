## Analysis Streaming API — Analyze Route

### Overview
Starts the AI analysis pipeline for an existing analysis record and streams realtime progress and results using Server‑Sent Events (SSE).

- **Method**: POST
- **Path**: `/api/analysis/[analysisId]/analyze`
- **Streaming**: Yes (SSE over HTTP)
- **Auth**: Required (Bearer access token)
- **Source**: `app/api/analysis/[analysisId]/analyze/route.ts`

### Authentication
Provide a Supabase access token in the Authorization header.

```
Authorization: Bearer <ACCESS_TOKEN>
```

### Request
- **Path params**:
  - `analysisId` (string, required): ID of the existing analysis row. The image URL is taken from this record.
- **Body**: none

### Response
- On success, returns a streaming response using SSE:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`

The server emits lines prefixed with `data: ` followed by a JSON payload, and a blank line between events.

### Event stream schema
Each SSE event has a `type` field. The following types may be sent:

- `start`
  - Example:
  ```json
  { "type": "start", "message": "Starting AI analysis...", "analysisId": "<id>" }
  ```

- `yolo_analysis`
  - Starts object detection and segmentation.
  ```json
  { "type": "yolo_analysis", "message": "Starting object detection and segmentation..." }
  ```

- `detections_found`
  - Emitted after valid detections are filtered.
  ```json
  {
    "type": "detections_found",
    "message": "Found <n> objects to analyze",
    "data": { "detectionCount": 2, "detectionTypes": ["person", "bag"] }
  }
  ```

- `processing_detection`
  - Per detection progress.
  ```json
  {
    "type": "processing_detection",
    "message": "Processing person detection 1/2",
    "data": { "detectionType": "person", "confidence": 0.91, "progress": 1, "total": 2 }
  }
  ```

- `ai_analysis_step`
  - Fine‑grained steps from the AI pipeline (luxury analysis, image conversion, streaming authenticity analysis, translation, compilation). Includes segment context when applicable.
  ```json
  {
    "type": "ai_analysis_step",
    "step": "fake_goods_streaming",
    "message": "...partial analysis text chunk...",
    "data": { "authentic_probability": 0.74, "confidence_level": "medium" },
    "segmentInfo": {
      "detectionIndex": 0,
      "segmentIndex": 1,
      "detectionType": "human",
      "totalDetections": 2,
      "totalSegments": 3
    }
  }
  ```

- `yolo_error`
  - Object detection failed; the route will fall back to full‑image analysis.
  ```json
  { "type": "yolo_error", "message": "Object detection failed, using fallback analysis", "error": "..." }
  ```

- `fallback_analysis`
  - Indicates full‑image fallback mode.
  ```json
  { "type": "fallback_analysis", "message": "Performing full image analysis as fallback..." }
  ```

- `progress`
  - Emitted after each segment/detail is saved to storage and the database.
  ```json
  {
    "type": "progress",
    "step": 1,
    "total": 3,
    "detail": {
      "id": "<analysis_detail_id>",
      "type": "human_segment_1_part_1",
      "description": "Analysis of human 1 segment part 1 (...) - ...",
      "confidence": 0.82,
      "segmentIndex": "0_0",
      "coordinates": { "x": 10, "y": 20, "width": 200, "height": 300 },
      "manipulationDetected": false
    }
  }
  ```

- `summary_progress`
  - Before generating the overall summary.
  ```json
  { "type": "summary_progress", "message": "Generating overall analysis summary..." }
  ```

- `summary_complete`
  - Final overall summary and confidence that is also saved on the main `analysis` row.
  ```json
  {
    "type": "summary_complete",
    "message": "Analysis summary saved successfully",
    "summary": {
      "overallResult": "suspicious", // one of: authentic | suspicious | likely_fake
      "confidence": 0.76,
      "summary": "Overall Analysis Summary...",
      "authenticityAssessment": "Moderate confidence with some areas of concern..."
    }
  }
  ```

- `complete`
  - Stream completion marker.
  ```json
  { "type": "complete", "message": "AI analysis completed successfully", "analysisId": "<id>", "totalDetails": 3 }
  ```

- `error`
  - Any operational error while saving images or rows.
  ```json
  { "type": "error", "message": "Failed to save human_segment_1_part_1 image", "error": "..." }
  ```

### Side effects
- Uploads segment images to Supabase Storage bucket `analysis-images` under `<analysisId>/segment_<index>_<timestamp>.png`.
- Inserts rows into `analysis_detail` with per‑segment metadata and AI findings.
- Updates the parent `analysis` row with overall summary and confidence.

### cURL example
Use `-N` to disable buffering and print events as they arrive.

```bash
curl -N -X POST \
  "http://localhost:3000/api/analysis/<ANALYSIS_ID>/analyze" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Accept: text/event-stream"
```

### JavaScript example (fetch streaming)
```javascript
async function analyze(analysisId, accessToken) {
  const res = await fetch(`/api/analysis/${analysisId}/analyze`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6);
      try {
        const evt = JSON.parse(json);
        console.log('SSE event:', evt.type, evt);
      } catch {}
    }
  }
}
```

### Error responses (non‑streaming)
- 401 Unauthorized (missing/invalid token)
```json
{ "success": false, "error": "Authorization header with Bearer token is required" }
```

- 401 Unauthorized (invalid/expired token)
```json
{ "success": false, "error": "Invalid or expired token" }
```

- 403 Forbidden (not owner or admin)
```json
{ "success": false, "error": "Unauthorized to analyze this image" }
```

- 404 Not Found (analysis not found)
```json
{ "success": false, "error": "Analysis not found" }
```

- 500 Internal Server Error
```json
{ "success": false, "error": "Internal server error" }
```

### Notes
- This endpoint reads the image URL from the `analysis` row by `analysisId` and does not accept a request body.
- The streaming payload includes rich per‑segment metadata when available (`segmentIndex`, `coordinates`, `yoloDetection`, and AI analysis results) and may vary slightly between human and non‑human detections.
- CORS is enabled for `POST, OPTIONS` with `Authorization` allowed.


