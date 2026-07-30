# Admin Portal — Story API Endpoints

**Base URL:** `https://api-f6x7qpormq-uc.a.run.app/api`

**Auth Header (all requests):**
```
Authorization: Bearer <Firebase ID Token>
```

---

## 1. GET All Stories

```
GET /stories
```

**Response** `200`
```json
[
  {
    "storyId": "CpRMulUEYNWn65XC0xez",
    "title": "The Girl Who Asked Why",
    "genre": "philosophical",
    "description": "It follows Amara, an eleven-year-old girl...",
    "coverImageUrl": "https://firebasestorage.googleapis.com/...",
    "coverImage": "https://firebasestorage.googleapis.com/...",
    "readingTime": 34,
    "totalChapters": 10,
    "ageRange": { "min": 5, "max": 12 }
  }
]
```

> [!NOTE]
> `coverImageUrl` and `coverImage` return the same value. Use whichever field name your frontend prefers.

---

## 2. GET Single Story (with chapters)

```
GET /stories/:storyId
```

**Response** `200`
```json
{
  "storyId": "CpRMulUEYNWn65XC0xez",
  "title": "The Girl Who Asked Why",
  "genre": "philosophical",
  "description": "It follows Amara...",
  "coverImageUrl": "https://...",
  "coverImage": "https://...",
  "readingTime": 34,
  "totalChapters": 10,
  "ageRange": { "min": 5, "max": 12 },
  "chapters": [
    {
      "chapterId": "chapter_1",
      "chapterNumber": 1,
      "title": "The History Teacher",
      "imageUrl": "https://...",
      "wordCount": 312,
      "content": "Amara sat in the back row of her history class..."
    }
  ]
}
```

> [!IMPORTANT]
> The `content` field on each chapter is the raw text string for the Edit form textarea. Use this to pre-fill the chapter editor.

---

## 3. POST Create Story

```
POST /stories/submit
```

**Request Body**
```json
{
  "title": "The Girl Who Asked Why",
  "genre": "philosophical",
  "description": "It follows Amara...",
  "coverImageUrl": "https://firebasestorage.googleapis.com/...",
  "readingTime": 34,
  "ageRange": { "min": 5, "max": 12 },
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "The History Teacher",
      "imageUrl": "https://...",
      "content": "Amara sat in the back row of her history class. She stared at the chalkboard...\n\nThe teacher, Mr. Owens, pointed to a faded map..."
    }
  ]
}
```

**Response** `201`
```json
{ "success": true, "storyId": "CpRMulUEYNWn65XC0xez" }
```

> [!TIP]
> The `content` field accepts plain text. Use `\n\n` (double newline) to separate paragraphs. The backend automatically splits it into TTS-optimized sentences.

---

## 4. PUT Update Story

```
PUT /stories/:storyId
```

**Request Body** — Same shape as POST.
```json
{
  "title": "The Girl Who Asked Why (Revised)",
  "genre": "philosophical",
  "description": "Updated description...",
  "coverImageUrl": "https://firebasestorage.googleapis.com/...",
  "readingTime": 36,
  "ageRange": { "min": 5, "max": 12 },
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "The History Teacher",
      "imageUrl": "https://...",
      "content": "Amara sat in the back row..."
    }
  ]
}
```

**Response** `200`
```json
{ "success": true, "storyId": "CpRMulUEYNWn65XC0xez" }
```

> [!WARNING]
> PUT **completely replaces** all chapters. You must send the full chapters array every time, even for chapters that didn't change. Any chapter not included will be deleted.

---

## 5. DELETE Story

```
DELETE /stories/:storyId
```

**Response** `200`
```json
{ "success": true, "storyId": "CpRMulUEYNWn65XC0xez" }
```

> [!CAUTION]
> This permanently deletes the story and all of its chapters. There is no undo.

---

## Cover Image Field

The backend accepts **either** `coverImage` or `coverImageUrl` on POST/PUT. Both map to the same database field. On GET responses, both are returned.

## Error Responses

All endpoints return errors in this format:
```json
{ "error": "Description of the error" }
```

| Status | Meaning |
|--------|---------|
| `400` | Missing required fields |
| `401` | Missing or invalid auth token |
| `403` | Not an admin |
| `404` | Story or chapter not found |
| `500` | Server error |
