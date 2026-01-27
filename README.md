# TabTabGo PDF Generator

A Node.js service that converts HTML to PDF using Puppeteer with API key authentication.

## Features

- ✅ Convert HTML to PDF using Puppeteer
- ✅ RESTful API with `/documents/generator/pdf` endpoint
- ✅ API key authentication (supports multiple keys)
- ✅ Dependency injection for better testability
- ✅ Configurable PDF options via request payload
- ✅ Returns PDF as a stream
- ✅ Constant-time API key comparison (security best practice)
- ✅ Comprehensive error handling
- ✅ Health check endpoint

## Installation

1. Clone the repository:
```bash
git clone https://github.com/TabTabGo/tabtabgo-pdf-generator.git
cd tabtabgo-pdf-generator
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set your API keys:
```env
PORT=3000
API_KEYS=your-secret-key-1,your-secret-key-2,your-secret-key-3
```

## Deployment

### Windows Server with IIS

For detailed instructions on deploying this service on Windows Server using IIS, see:

📖 **[Windows Server IIS Deployment Guide](DEPLOYMENT_IIS.md)**

The guide includes:
- Step-by-step installation instructions
- IIS configuration with iisnode
- SSL/HTTPS setup
- Troubleshooting tips
- Performance optimization
- Security best practices

## Usage

### Start the server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

The service will start on `http://localhost:3000` (or the port specified in `.env`).

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Generate PDF
```bash
POST /documents/generator/pdf
```

**Headers:**
- `Content-Type: application/json`
- `x-api-key: your-api-key` OR `Authorization: Bearer your-api-key`

**Request Body:**
```json
{
  "contentType": "html",
  "content": "<html><body><h1>Hello World</h1><p>This is a test PDF</p></body></html>",
  "options": {
    "format": "A4",
    "printBackground": true,
    "margin": {
      "top": "1cm",
      "right": "1cm",
      "bottom": "1cm",
      "left": "1cm"
    }
  }
}
```

**Response:**
- Success: Returns PDF file as a binary stream
- Error: Returns JSON with error details

### Example with cURL

```bash
curl -X POST http://localhost:3000/documents/generator/pdf \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "contentType": "html",
    "content": "<html><body><h1>Test PDF</h1></body></html>",
    "options": {
      "format": "A4",
      "printBackground": true
    }
  }' \
  --output output.pdf
```

### Example with JavaScript

```javascript
const response = await fetch('http://localhost:3000/documents/generator/pdf', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key',
  },
  body: JSON.stringify({
    contentType: 'html',
    content: '<html><body><h1>Hello World</h1></body></html>',
    options: {
      format: 'A4',
      printBackground: true,
    },
  }),
});

const pdfBlob = await response.blob();
// Save or display the PDF
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `API_KEYS` | Comma-separated list of API keys | - |
| `PUPPETEER_EXECUTABLE_PATH` | Custom Chromium path (optional) | - |

### PDF Options

The `options` field in the request supports all Puppeteer PDF options:

- `format`: Paper format (e.g., 'A4', 'Letter', 'Legal')
- `width`: Paper width (e.g., '8.5in')
- `height`: Paper height (e.g., '11in')
- `margin`: Object with top, right, bottom, left margins
- `printBackground`: Boolean to include background graphics
- `landscape`: Boolean for landscape orientation
- `pageRanges`: Page ranges to print (e.g., '1-5, 8, 11-13')
- `preferCSSPageSize`: Use CSS-defined page size
- `displayHeaderFooter`: Display header and footer
- `headerTemplate`: HTML template for header
- `footerTemplate`: HTML template for footer

See [Puppeteer PDF documentation](https://pptr.dev/api/puppeteer.pdfoptions) for all options.

## Architecture

### Dependency Injection

The service uses dependency injection for Puppeteer, allowing better control and testability:

```javascript
import { createPdfGeneratorService } from './services/pdfGenerator.js';

// Default: uses actual Puppeteer
const service = createPdfGeneratorService();

// For testing: inject mock Puppeteer
const mockPuppeteer = { /* mock implementation */ };
const testService = createPdfGeneratorService(mockPuppeteer);
```

### Security

- **API Key Authentication**: Uses constant-time comparison to prevent timing attacks
- **Multiple API Keys**: Supports multiple keys for different clients
- **Header Options**: Accepts API key via `x-api-key` or `Authorization` header

## Development

### Project Structure

```
tabtabgo-pdf-generator/
├── src/
│   ├── config/         # Configuration files
│   ├── middleware/     # Express middleware
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   └── index.js        # Server entry point
├── .env.example        # Example environment variables
├── package.json
└── README.md
```

## License

ISC
