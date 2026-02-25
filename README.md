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

### Option 1: Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/TabTabGo/tabtabgo-pdf-generator.git
cd tabtabgo-pdf-generator
```

2. Build and run with Docker Compose:
```bash
# Set your API keys (or use default for testing)
export API_KEYS=your-secret-key-1,your-secret-key-2

# Start the service
docker-compose up -d
```

3. Or build and run with Docker directly:
```bash
# Build the image
# Note: If building in an environment with certificate issues, use:
# docker build --build-arg NPM_CONFIG_STRICT_SSL=false -t tabtabgo-pdf-generator .
docker build -t tabtabgo-pdf-generator .

# Run the container
docker run -d \
  -p 3000:3000 \
  -e API_KEYS=your-secret-key-1,your-secret-key-2 \
  --name pdf-generator \
  tabtabgo-pdf-generator
```

The service will be available at `http://localhost:3000`.

### Option 2: Local Installation

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

## Usage

### Start the server

**With Docker:**
```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Without Docker:**
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
├── Dockerfile          # Docker image definition
├── docker-compose.yml  # Docker Compose configuration
├── package.json
└── README.md
```

## Deployment

### Docker Deployment

The application is containerized and ready for deployment to any Docker-compatible platform.

#### Building for Production

```bash
# Build the Docker image
docker build -t tabtabgo-pdf-generator:latest .

# Tag for your registry (optional)
docker tag tabtabgo-pdf-generator:latest your-registry/tabtabgo-pdf-generator:latest

# Push to registry (optional)
docker push your-registry/tabtabgo-pdf-generator:latest
```

#### Cloud Deployment

**AWS ECS/Fargate:**
```bash
# Authenticate with ECR
aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account.dkr.ecr.your-region.amazonaws.com

# Build and push
docker build -t your-account.dkr.ecr.your-region.amazonaws.com/pdf-generator:latest .
docker push your-account.dkr.ecr.your-region.amazonaws.com/pdf-generator:latest
```

**Google Cloud Run:**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/your-project/pdf-generator
gcloud run deploy pdf-generator --image gcr.io/your-project/pdf-generator --platform managed
```

**Azure Container Instances:**
```bash
# Create container registry and push
az acr build --registry your-registry --image pdf-generator:latest .
az container create --resource-group your-rg --name pdf-generator --image your-registry.azurecr.io/pdf-generator:latest
```

**Important:** Always set secure API keys via environment variables when deploying to production.

## License

ISC
