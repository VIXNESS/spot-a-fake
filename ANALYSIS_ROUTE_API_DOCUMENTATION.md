## Analysis Resource API — /api/analysis/[analysisId]

### Overview
Fetch or delete a single analysis resource. Returns standard JSON responses and does not stream.

- **Methods**: GET, DELETE
- **Path**: `/api/analysis/[analysisId]`
- **Streaming**: No (standard JSON, not SSE)
- **Auth**: Required (Bearer access token)
- **Source**: `app/api/analysis/[analysisId]/route.ts`

### Authentication
Provide a Supabase access token in the Authorization header.

```
Authorization: Bearer <ACCESS_TOKEN>
```

### GET /api/analysis/[analysisId]
- **Description**: Retrieve an analysis row and its associated `analysis_detail` rows.
- **Path params**:
  - `analysisId` (string, required): ID of the analysis.
- **Body**: none

#### Permissions
- Owner or admin can view; public analyses are viewable by anyone with a valid token.

#### Success response (200)
Headers:
- `Content-Type: application/json`

Body:
```json
{
  "success": true,
  "data": {
    "analysis": { /* full analysis row */ },
    "details": [ /* zero or more analysis_detail rows */ ]
  }
}
```

#### Error responses
- 401 Unauthorized (missing/invalid token)
```json
{ "success": false, "error": "Authorization header with Bearer token is required" }
```
- 401 Unauthorized (invalid/expired token)
```json
{ "success": false, "error": "Invalid or expired token" }
```
- 403 Forbidden (no access)
```json
{ "success": false, "error": "Unauthorized to view this analysis" }
```
- 404 Not Found
```json
{ "success": false, "error": "Analysis not found" }
```
- 500 Internal Server Error
```json
{ "success": false, "error": "Failed to fetch analysis details" }
```

#### cURL example (GET)
```bash
curl -X GET \
  "http://localhost:3000/api/analysis/<ANALYSIS_ID>" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### DELETE /api/analysis/[analysisId]
- **Description**: Delete an analysis. Also attempts to remove its stored image from Supabase Storage.
- **Path params**:
- `analysisId` (string, required): ID of the analysis.
- **Body**: none

#### Permissions
- Owner or admin only.

#### Success response (200)
Headers:
- `Content-Type: application/json`

Body:
```json
{ "success": true, "message": "Analysis deleted successfully" }
```

#### Error responses
- 401 Unauthorized (missing/invalid token)
```json
{ "success": false, "error": "Authorization header with Bearer token is required" }
```
- 401 Unauthorized (invalid/expired token)
```json
{ "success": false, "error": "Invalid or expired token" }
```
- 403 Forbidden
```json
{ "success": false, "error": "Unauthorized to delete this analysis" }
```
- 404 Not Found
```json
{ "success": false, "error": "Analysis not found" }
```
- 500 Internal Server Error
```json
{ "success": false, "error": "Failed to delete analysis" }
```

Note: If storage deletion of the image fails, the route logs the error but does not fail the request.

#### cURL example (DELETE)
```bash
curl -X DELETE \
  "http://localhost:3000/api/analysis/<ANALYSIS_ID>" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### CORS
This route responds to `OPTIONS` and allows:
- **Methods**: `GET, DELETE, OPTIONS`
- **Headers**: `Content-Type, Authorization`
- **Origin**: `*`

### Notes
- This route does not use HTTP streaming; responses are returned as standard JSON objects.
- For the streaming analysis pipeline, see `ANALYZE_ROUTE_API_DOCUMENTATION.md` documenting `/api/analysis/[analysisId]/analyze` (SSE).


