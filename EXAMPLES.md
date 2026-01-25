# TabTabGo PDF Generator - Usage Examples

This document provides comprehensive examples for using the TabTabGo PDF Generator Service.

## Quick Start

1. Start the server:
```bash
npm start
```

2. Make a simple PDF generation request:
```bash
curl -X POST http://localhost:3000/documents/generator/pdf \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "contentType": "html",
    "content": "<html><body><h1>Hello World</h1></body></html>"
  }' \
  --output output.pdf
```

## Authentication Examples

### Using x-api-key Header
```bash
curl -X POST http://localhost:3000/documents/generator/pdf \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"contentType": "html", "content": "<html>...</html>"}' \
  --output output.pdf
```

### Using Authorization Bearer Token
```bash
curl -X POST http://localhost:3000/documents/generator/pdf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"contentType": "html", "content": "<html>...</html>"}' \
  --output output.pdf
```

## PDF Options Examples

### Landscape Orientation
```json
{
  "contentType": "html",
  "content": "<html><body><h1>Landscape PDF</h1></body></html>",
  "options": {
    "format": "A4",
    "landscape": true
  }
}
```

### Custom Margins
```json
{
  "contentType": "html",
  "content": "<html><body><h1>Custom Margins</h1></body></html>",
  "options": {
    "format": "A4",
    "margin": {
      "top": "2cm",
      "right": "2cm",
      "bottom": "2cm",
      "left": "2cm"
    }
  }
}
```

### Custom Page Size
```json
{
  "contentType": "html",
  "content": "<html><body><h1>Custom Size</h1></body></html>",
  "options": {
    "width": "8.5in",
    "height": "11in",
    "printBackground": true
  }
}
```

### Header and Footer
```json
{
  "contentType": "html",
  "content": "<html><body><h1>With Header/Footer</h1></body></html>",
  "options": {
    "format": "A4",
    "displayHeaderFooter": true,
    "headerTemplate": "<div style='font-size:10px;text-align:center;width:100%;'>Header Text</div>",
    "footerTemplate": "<div style='font-size:10px;text-align:center;width:100%;'>Page <span class='pageNumber'></span> of <span class='totalPages'></span></div>",
    "margin": {
      "top": "2cm",
      "bottom": "2cm"
    }
  }
}
```

## JavaScript Examples

### Using Fetch API
```javascript
async function generatePdf(htmlContent, options = {}) {
  const response = await fetch('http://localhost:3000/documents/generator/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'your-api-key',
    },
    body: JSON.stringify({
      contentType: 'html',
      content: htmlContent,
      options: options,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`PDF generation failed: ${error.message}`);
  }

  return await response.blob();
}

// Usage
const pdfBlob = await generatePdf(
  '<html><body><h1>My PDF</h1></body></html>',
  { format: 'A4', printBackground: true }
);

// Download the PDF
const url = URL.createObjectURL(pdfBlob);
const a = document.createElement('a');
a.href = url;
a.download = 'document.pdf';
a.click();
```

### Using Axios
```javascript
const axios = require('axios');
const fs = require('fs');

async function generatePdf(htmlContent, outputPath) {
  const response = await axios.post(
    'http://localhost:3000/documents/generator/pdf',
    {
      contentType: 'html',
      content: htmlContent,
      options: {
        format: 'A4',
        printBackground: true,
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'your-api-key',
      },
      responseType: 'arraybuffer',
    }
  );

  fs.writeFileSync(outputPath, response.data);
  console.log(`PDF saved to ${outputPath}`);
}

// Usage
await generatePdf(
  '<html><body><h1>Invoice</h1></body></html>',
  './invoice.pdf'
);
```

### Using Node.js HTTP
```javascript
const https = require('https');
const fs = require('fs');

function generatePdf(htmlContent, outputPath) {
  const data = JSON.stringify({
    contentType: 'html',
    content: htmlContent,
    options: {
      format: 'A4',
      printBackground: true,
    },
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/documents/generator/pdf',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'your-api-key',
      'Content-Length': data.length,
    },
  };

  const req = http.request(options, (res) => {
    const fileStream = fs.createWriteStream(outputPath);
    res.pipe(fileStream);
    
    fileStream.on('finish', () => {
      console.log(`PDF saved to ${outputPath}`);
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.write(data);
  req.end();
}

// Usage
generatePdf(
  '<html><body><h1>Report</h1></body></html>',
  './report.pdf'
);
```

## Real-World Examples

### Invoice Generation
```javascript
const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #3498db; color: white; }
    .total { font-weight: bold; font-size: 1.2em; }
  </style>
</head>
<body>
  <h1>Invoice #12345</h1>
  <p><strong>Date:</strong> January 25, 2026</p>
  <p><strong>Customer:</strong> ACME Corporation</p>
  
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Quantity</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>PDF Generation Service</td>
        <td>100</td>
        <td>$0.50</td>
        <td>$50.00</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" class="total">Total:</td>
        <td class="total">$50.00</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>
`;

const pdfBlob = await generatePdf(invoiceHtml, {
  format: 'A4',
  printBackground: true,
  margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
});
```

### Report with Charts
```javascript
const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .chart { 
      width: 100%; 
      height: 300px; 
      background: linear-gradient(to top, #3498db 40%, #e74c3c 60%);
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>Monthly Sales Report</h1>
  <p>Generated on: January 25, 2026</p>
  <div class="chart"></div>
  <p>Total Sales: $125,000</p>
</body>
</html>
`;

const pdfBlob = await generatePdf(reportHtml, {
  format: 'Letter',
  landscape: true,
  printBackground: true
});
```

## Error Handling

```javascript
async function generatePdfWithErrorHandling(htmlContent) {
  try {
    const response = await fetch('http://localhost:3000/documents/generator/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'your-api-key',
      },
      body: JSON.stringify({
        contentType: 'html',
        content: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 401) {
        console.error('Authentication failed: Missing API key');
      } else if (response.status === 403) {
        console.error('Authentication failed: Invalid API key');
      } else if (response.status === 400) {
        console.error('Validation error:', error.details);
      } else if (response.status === 500) {
        console.error('Server error:', error.message);
      }
      
      throw new Error(error.message);
    }

    return await response.blob();
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}
```

## Testing Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "service": "tabtabgo-pdf-generator",
  "timestamp": "2026-01-25T16:00:00.000Z"
}
```

### API Documentation
```bash
curl http://localhost:3000/
```

## Tips and Best Practices

1. **Always include proper styles**: Puppeteer renders HTML exactly as a browser would, so include all CSS styles inline or in `<style>` tags.

2. **Use printBackground: true**: If your HTML has background colors or images, set this option to true.

3. **Test with different page sizes**: Make sure your HTML content works well with your chosen page format.

4. **Handle errors gracefully**: Always implement proper error handling in your client code.

5. **Validate HTML**: Ensure your HTML is well-formed before sending it to the API.

6. **Use appropriate margins**: Add margins to ensure content doesn't get cut off at page edges.

7. **Consider file size**: Large HTML content or high-resolution images will result in larger PDF files.

8. **Secure your API keys**: Never commit API keys to version control. Use environment variables.
