---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-07-30
source_count: 3
confidence: high
---

# File Upload Security

> Validation gate for all user-uploaded files before processing  
> `apps/backend/src/middleware/file-upload.ts`

## Principle

Files are ephemeral — parsed immediately to extract textual content, then discarded. But before parsing, they must be validated for size, type, and integrity. No binary file is ever persisted.

## Validation Rules

| Rule | Value | Error |
|------|-------|-------|
| Max file size | 10 MB | `FILE_TOO_LARGE` |
| Allowed MIME types | `text/plain`, `text/markdown`, `text/csv`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/pdf` | `FILE_TYPE_NOT_ALLOWED` |
| Allowed extensions | `.txt`, `.md`, `.csv`, `.docx`, `.pdf` | `FILE_TYPE_NOT_ALLOWED` |
| Max files per request | 5 | `TOO_MANY_FILES` |
| Empty file | Not allowed | `FILE_EMPTY` |

## Middleware

```typescript
// apps/backend/src/middleware/file-upload.ts

import multer from 'multer';
import { ValidationError } from '@flow-app/domain';

const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB
const MAX_FILES = 5;
const ALLOWED_MIMES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
];

// Memory storage: file lives in RAM, parsed, then discarded.
// No disk, no S3 — files are ephemeral.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      cb(new ValidationError(
        `File type '${file.mimetype}' not allowed. Accepted: ${ALLOWED_MIMES.join(', ')}`
      ));
      return;
    }
    cb(null, true);
  },
});

// Route-level usage
router.post('/api/tools/:toolKey/sessions',
  upload.fields([
    { name: 'files', maxCount: MAX_FILES },
  ]),
  async (req, res) => {
    // files are now in req.files as Buffer[]
    // Validate emptiness
    for (const file of req.files as Express.Multer.File[]) {
      if (file.size === 0) {
        throw new ValidationError(`File '${file.originalname}' is empty`);
      }
    }
    // ... continue to StartSessionUseCase
  }
);
```

## File Parser

After validation, files are parsed to extract textual content. The Buffer is converted to a string and discarded.

```typescript
// apps/backend/src/infrastructure/file-parser.ts

import mammoth from 'mammoth'; // .docx → text
import pdf from 'pdf-parse';   // .pdf → text

class FileParser {
  async parse(file: Express.Multer.File): Promise<string> {
    switch (file.mimetype) {
      case 'text/plain':
      case 'text/markdown':
      case 'text/csv':
        return file.buffer.toString('utf-8');

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docx = await mammoth.extractRawText({ buffer: file.buffer });
        return docx.value;

      case 'application/pdf':
        const pdfData = await pdf(file.buffer);
        return pdfData.text;

      default:
        throw new ValidationError(`Unsupported file type: ${file.mimetype}`);
    }
  }
}
```

### New Dependencies

```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1",
    "mammoth": "^1.8.0",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "@types/multer": "^1.4.12",
    "@types/pdf-parse": "^1.1.4"
  }
}
```

**Note**: `mammoth` and `pdf-parse` are lightweight, Context7-verifiable packages. Files are ephemeral — after parsing, only the extracted text remains in memory (XState context). The original Buffer is garbage-collected. The parsed text is saved in `session_snapshots` JSONB for crash recovery and deleted with the retention policy.

## Sources

- [[Environment Configuration]] — file size limits
- [[sources/PRD]] — NFR-S03 (input validation)
- [[sources/USER-STORIES]] — US-SC01 (CSRF), US-SC02 (rate limiting)