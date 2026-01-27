# Deploying TabTabGo PDF Generator on Windows Server with IIS

This guide provides comprehensive instructions for deploying the TabTabGo PDF Generator service on Windows Server using Internet Information Services (IIS).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Install Node.js](#step-1-install-nodejs)
- [Step 2: Install IIS Features](#step-2-install-iis-features)
- [Step 3: Install iisnode](#step-3-install-iisnode)
- [Step 4: Install URL Rewrite Module](#step-4-install-url-rewrite-module)
- [Step 5: Deploy Application Files](#step-5-deploy-application-files)
- [Step 6: Configure IIS Application](#step-6-configure-iis-application)
- [Step 7: Set Environment Variables](#step-7-set-environment-variables)
- [Step 8: Configure Application Pool](#step-8-configure-application-pool)
- [Step 9: Test the Deployment](#step-9-test-the-deployment)
- [Step 10: Configure SSL/HTTPS (Recommended)](#step-10-configure-sslhttps-recommended)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)
- [Security Best Practices](#security-best-practices)

## Prerequisites

- Windows Server 2016 or later (Windows Server 2019/2022 recommended)
- Administrator access to the server
- Basic knowledge of IIS and PowerShell
- Internet connectivity for downloading dependencies

## Step 1: Install Node.js

1. **Download Node.js**
   - Visit [https://nodejs.org/](https://nodejs.org/)
   - Download the **LTS version** (64-bit) for Windows
   - Alternatively, download from: [https://nodejs.org/dist/](https://nodejs.org/dist/)

2. **Install Node.js**
   ```powershell
   # Run the installer with default settings or use winget
   winget install OpenJS.NodeJS.LTS
   ```

3. **Verify Installation**
   ```powershell
   node --version
   npm --version
   ```
   Expected output: Node.js version 18.x or higher

## Step 2: Install IIS Features

1. **Open PowerShell as Administrator**

2. **Install Required IIS Features**
   ```powershell
   # Install IIS with required features
   Install-WindowsFeature -Name Web-Server -IncludeManagementTools
   Install-WindowsFeature -Name Web-WebServer
   Install-WindowsFeature -Name Web-Common-Http
   Install-WindowsFeature -Name Web-Default-Doc
   Install-WindowsFeature -Name Web-Dir-Browsing
   Install-WindowsFeature -Name Web-Http-Errors
   Install-WindowsFeature -Name Web-Static-Content
   Install-WindowsFeature -Name Web-Http-Logging
   Install-WindowsFeature -Name Web-Request-Monitor
   Install-WindowsFeature -Name Web-Filtering
   Install-WindowsFeature -Name Web-Stat-Compression
   Install-WindowsFeature -Name Web-Dyn-Compression
   ```

3. **Verify IIS Installation**
   - Open Internet Information Services (IIS) Manager
   - Or run: `inetmgr` from command prompt

## Step 3: Install iisnode

iisnode enables hosting Node.js applications in IIS.

1. **Download iisnode**
   - Visit [https://github.com/Azure/iisnode/releases](https://github.com/Azure/iisnode/releases)
   - Download the latest stable version for x64
   - At the time of writing, the latest version is v0.2.26, but check for newer versions

2. **Install iisnode**
   ```powershell
   # Run the downloaded installer
   # Or use command line (replace with actual version number):
   msiexec /i iisnode-full-v0.2.26-x64.msi /qn
   ```

3. **Verify Installation**
   ```powershell
   # Check if iisnode module is installed
   Get-WebGlobalModule | Where-Object { $_.Name -like "*iisnode*" }
   ```

## Step 4: Install URL Rewrite Module

The URL Rewrite module is required for routing requests to Node.js.

1. **Download URL Rewrite Module**
   - Visit [https://www.iis.net/downloads/microsoft/url-rewrite](https://www.iis.net/downloads/microsoft/url-rewrite)
   - Download the x64 version

2. **Install URL Rewrite**
   ```powershell
   # Run the installer
   # Or download and install via WebPI
   ```

3. **Verify Installation**
   - Open IIS Manager
   - Select a site or server node
   - Check if "URL Rewrite" icon appears in Features View

## Step 5: Deploy Application Files

1. **Create Application Directory**
   ```powershell
   # Create directory for the application
   New-Item -ItemType Directory -Path "C:\inetpub\wwwroot\tabtabgo-pdf-generator"
   cd "C:\inetpub\wwwroot\tabtabgo-pdf-generator"
   ```

2. **Deploy Application Files**

   **Option A: Clone from Git (Development/Testing)**
   ```powershell
   git clone https://github.com/TabTabGo/tabtabgo-pdf-generator.git .
   ```

   **Option B: Use Release Tag (Recommended for Production)**
   ```powershell
   # Clone and checkout a specific release version
   git clone https://github.com/TabTabGo/tabtabgo-pdf-generator.git .
   git checkout tags/v1.0.0  # Replace with desired release version
   ```

   **Option C: Manual Copy**
   - Download the latest release from GitHub
   - Extract and copy all application files to `C:\inetpub\wwwroot\tabtabgo-pdf-generator`
   - Ensure you copy: `src/`, `package.json`, `package-lock.json`

3. **Install Dependencies**
   ```powershell
   npm install --production
   ```

4. **Install Puppeteer Windows Dependencies**
   
   Puppeteer requires additional Windows libraries:
   ```powershell
   # Install Windows Build Tools (if needed)
   npm install --global windows-build-tools
   
   # Puppeteer will download Chromium automatically
   # Verify Puppeteer installation
   node -e "console.log(require('puppeteer').executablePath())"
   ```

## Step 6: Configure IIS Application

1. **Create web.config File**

   Create a `web.config` file in the application root directory:
   ```powershell
   # The web.config content is provided in the next step
   ```

2. **Open IIS Manager**
   ```powershell
   inetmgr
   ```

3. **Create New Application**
   - Right-click on "Default Web Site" (or your preferred site)
   - Select "Add Application"
   - Alias: `pdf-generator` (or your preferred name)
   - Physical path: `C:\inetpub\wwwroot\tabtabgo-pdf-generator`
   - Application pool: Create a new one (see Step 8)
   - Click OK

   **Alternative: Create as a New Website**
   - Right-click "Sites" > "Add Website"
   - Site name: `tabtabgo-pdf-generator`
   - Physical path: `C:\inetpub\wwwroot\tabtabgo-pdf-generator`
   - Binding: 
     - Type: HTTP
     - IP address: All Unassigned
     - Port: 8080 (or your preferred port)
   - Application pool: Create a new one (see Step 8)

## Step 7: Set Environment Variables

1. **Create .env File**
   ```powershell
   cd "C:\inetpub\wwwroot\tabtabgo-pdf-generator"
   
   # Copy example file
   Copy-Item .env.example .env
   
   # Edit the .env file
   notepad .env
   ```

2. **Configure Environment Variables**
   
   Edit `.env` file:
   ```env
   PORT=3000
   NODE_ENV=production
   API_KEYS=your-secret-key-1,your-secret-key-2,your-secret-key-3
   ```

   **Important Security Note**: 
   - Generate strong, random API keys
   - Never commit `.env` to version control
   - Keep API keys secure and rotate them regularly

3. **Set System Environment Variables (Optional)**
   
   For additional security, you can set environment variables at the system level:
   ```powershell
   # Set system-wide environment variable
   [System.Environment]::SetEnvironmentVariable("API_KEYS", "your-secret-keys", "Machine")
   
   # Restart IIS to apply changes
   iisreset
   ```

## Step 8: Configure Application Pool

1. **Create Application Pool**
   
   In IIS Manager:
   - Right-click "Application Pools"
   - Select "Add Application Pool"
   - Name: `TabTabGoPdfGeneratorAppPool`
   - .NET CLR version: "No Managed Code"
   - Managed pipeline mode: Integrated
   - Click OK

2. **Configure Application Pool Settings**
   
   Right-click the newly created application pool and select "Advanced Settings":
   
   - **General**
     - .NET CLR Version: "No Managed Code"
     - Managed Pipeline Mode: Integrated
     - Start Automatically: True
   
   - **Process Model**
     - Identity: ApplicationPoolIdentity (or a custom account with necessary permissions)
     - Idle Time-out (minutes): 20 (or 0 to disable)
     - Load User Profile: True (important for Node.js)
   
   - **Recycling**
     - Regular Time Interval (minutes): 1740 (29 hours) or your preference
     - Disable Overlapped Recycle: False

3. **Set Application Pool for Your Application**
   - Right-click your application in IIS Manager
   - Select "Manage Application" > "Advanced Settings"
   - Set "Application Pool" to `TabTabGoPdfGeneratorAppPool`

4. **Grant Permissions**
   ```powershell
   # Grant permissions to the application pool identity
   $appPoolIdentity = "IIS AppPool\TabTabGoPdfGeneratorAppPool"
   $appPath = "C:\inetpub\wwwroot\tabtabgo-pdf-generator"
   
   icacls $appPath /grant "${appPoolIdentity}:(OI)(CI)F" /T
   ```

## Step 9: Test the Deployment

1. **Restart IIS**
   ```powershell
   iisreset
   ```

2. **Test Health Endpoint**
   ```powershell
   # If deployed as application under Default Web Site
   Invoke-WebRequest -Uri "http://localhost/pdf-generator/health"
   
   # If deployed as standalone website on port 8080
   Invoke-WebRequest -Uri "http://localhost:8080/health"
   ```

   Expected response:
   ```json
   {
     "status": "ok",
     "service": "tabtabgo-pdf-generator",
     "timestamp": "2026-01-27T12:00:00.000Z"
   }
   ```

3. **Test PDF Generation**
   ```powershell
   # Create test request
   $body = @{
     contentType = "html"
     content = "<html><body><h1>Test PDF</h1><p>This is a test from IIS deployment</p></body></html>"
     options = @{
       format = "A4"
       printBackground = $true
     }
   } | ConvertTo-Json
   
   # Send request
   $headers = @{
     "Content-Type" = "application/json"
     "x-api-key" = "your-api-key"
   }
   
   Invoke-WebRequest -Uri "http://localhost/pdf-generator/documents/generator/pdf" `
     -Method POST `
     -Headers $headers `
     -Body $body `
     -OutFile "C:\temp\test.pdf"
   
   # Open the PDF to verify
   Start-Process "C:\temp\test.pdf"
   ```

## Step 10: Configure SSL/HTTPS (Recommended)

For production deployments, always use HTTPS.

1. **Obtain SSL Certificate**
   
   **Option A: Self-Signed Certificate (Development Only)**
   ```powershell
   # Create self-signed certificate
   $cert = New-SelfSignedCertificate -DnsName "yourdomain.com" `
     -CertStoreLocation "cert:\LocalMachine\My" `
     -KeyExportPolicy Exportable
   
   # Note the certificate thumbprint
   $cert.Thumbprint
   ```
   
   **Option B: Commercial Certificate**
   - Purchase from a Certificate Authority (CA)
   - Or use Let's Encrypt with a tool like win-acme

2. **Import Certificate to IIS**
   ```powershell
   # Import certificate
   Import-PfxCertificate -FilePath "C:\path\to\certificate.pfx" `
     -CertStoreLocation "cert:\LocalMachine\My" `
     -Password (ConvertTo-SecureString -String "password" -AsPlainText -Force)
   ```

3. **Add HTTPS Binding**
   
   In IIS Manager:
   - Right-click your site
   - Select "Edit Bindings"
   - Click "Add"
   - Type: HTTPS
   - Port: 443
   - SSL Certificate: Select your certificate
   - Click OK

4. **Force HTTPS Redirect (Optional)**
   
   Add to `web.config` under `<system.webServer>`:
   ```xml
   <rewrite>
     <rules>
       <rule name="HTTP to HTTPS redirect" stopProcessing="true">
         <match url="(.*)" />
         <conditions>
           <add input="{HTTPS}" pattern="off" ignoreCase="true" />
         </conditions>
         <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
       </rule>
     </rules>
   </rewrite>
   ```

## Troubleshooting

### Application Won't Start

1. **Check Event Viewer**
   ```powershell
   # Open Event Viewer
   eventvwr.msc
   
   # Navigate to: Windows Logs > Application
   # Look for errors from IIS or iisnode
   ```

2. **Enable Detailed Errors**
   
   In `web.config`, temporarily set for troubleshooting:
   ```xml
   <iisnode loggingEnabled="true" debuggingEnabled="true" />
   ```
   
   Check logs in: `C:\inetpub\wwwroot\tabtabgo-pdf-generator\iisnode`
   
   **IMPORTANT**: After troubleshooting, set `loggingEnabled="false"` in production to:
   - Prevent sensitive information exposure in logs
   - Improve performance
   - Reduce disk space usage
   
   If logging is needed in production, ensure log files are:
   - Not accessible via HTTP (use web.config to block access)
   - Regularly rotated and archived
   - Properly secured with appropriate file permissions

3. **Verify Node.js Path**
   ```powershell
   # Ensure Node.js is in system PATH
   node --version
   
   # If not, add to PATH or specify in web.config
   ```

### Puppeteer/Chromium Issues

1. **Chromium Not Found**
   ```powershell
   # Verify Puppeteer installation
   cd "C:\inetpub\wwwroot\tabtabgo-pdf-generator"
   node -e "console.log(require('puppeteer').executablePath())"
   
   # Reinstall if needed
   npm install puppeteer
   ```

2. **Permission Errors**
   ```powershell
   # Grant additional permissions
   $appPoolIdentity = "IIS AppPool\TabTabGoPdfGeneratorAppPool"
   icacls "node_modules\puppeteer\.local-chromium" /grant "${appPoolIdentity}:(OI)(CI)F" /T
   ```

3. **Chromium Crashes**
   - Ensure "Load User Profile" is set to True in Application Pool
   - Increase memory limits if needed
   - Check Windows Defender or antivirus isn't blocking Chromium

### API Key Issues

1. **Verify .env File**
   ```powershell
   # Check .env file exists and is readable
   Get-Content "C:\inetpub\wwwroot\tabtabgo-pdf-generator\.env"
   ```

2. **Test with Different Headers**
   ```powershell
   # Try x-api-key header
   $headers = @{ "x-api-key" = "your-api-key" }
   
   # Or Authorization Bearer
   $headers = @{ "Authorization" = "Bearer your-api-key" }
   ```

### Performance Issues

1. **Increase Application Pool Memory**
   - In Application Pool Advanced Settings
   - Increase "Private Memory Limit" (KB)

2. **Enable Output Caching**
   ```xml
   <!-- Add to web.config if appropriate for your use case -->
   <caching>
     <profiles>
       <add duration="3600" enabled="true" varyByParam="none" />
     </profiles>
   </caching>
   ```

3. **Monitor Resource Usage**
   ```powershell
   # Check CPU and memory usage
   Get-Counter '\Process(node)\% Processor Time'
   Get-Counter '\Process(node)\Working Set'
   ```

### Common Error Messages

**"HTTP Error 500.0 - Internal Server Error"**
- Check Node.js is installed and accessible
- Verify web.config is correct
- Check iisnode installation

**"HTTP Error 503 - Service Unavailable"**
- Application pool may be stopped
- Check application pool identity has correct permissions
- Review Event Viewer logs

**"Module iisnode not found"**
- Reinstall iisnode
- Verify iisnode module is registered in IIS

## Performance Optimization

### 1. Enable Response Compression
```powershell
# Enable static and dynamic compression
Install-WindowsFeature -Name Web-Stat-Compression
Install-WindowsFeature -Name Web-Dyn-Compression
```

In IIS Manager:
- Select your site
- Open "Compression"
- Enable both static and dynamic compression

### 2. Optimize Application Pool
- Set appropriate recycling policies
- Configure rapid-fail protection
- Enable 32-bit applications: False (for x64 Node.js)

### 3. Configure iisnode Performance
In `web.config`:
```xml
<iisnode
  nodeProcessCountPerApplication="0"
  maxConcurrentRequestsPerProcess="1024"
  maxNamedPipeConnectionRetry="24"
  namedPipeConnectionRetryDelay="250"
  maxNamedPipeConnectionPoolSize="512"
  maxNamedPipePooledConnectionAge="30000"
  asyncCompletionThreadCount="0"
  initialRequestBufferSize="4096"
  maxRequestBufferSize="65536"
/>
```

### 4. Monitor and Scale
- Use Windows Performance Monitor
- Consider Application Request Routing (ARR) for load balancing
- Implement health checks and monitoring

## Security Best Practices

### 1. Protect Environment Variables
```powershell
# Encrypt sensitive sections in web.config
cd $env:windir\Microsoft.NET\Framework64\v4.0.30319
.\aspnet_regiis.exe -pe "appSettings" -app "/pdf-generator" -site "Default Web Site"
```

### 2. Restrict File Permissions
```powershell
# Remove unnecessary permissions
$appPath = "C:\inetpub\wwwroot\tabtabgo-pdf-generator"
icacls $appPath /remove "Users" /T
icacls $appPath /remove "Everyone" /T
```

### 3. Configure Windows Firewall
```powershell
# Allow HTTPS traffic
New-NetFirewallRule -DisplayName "HTTPS Inbound" `
  -Direction Inbound `
  -LocalPort 443 `
  -Protocol TCP `
  -Action Allow
```

### 4. Regular Updates
- Keep Node.js updated
- Update npm packages regularly: `npm audit` and `npm update`
- Apply Windows Server updates
- Monitor security advisories for Puppeteer and dependencies

### 5. Rate Limiting
Consider implementing rate limiting at the IIS level using:
- IIS Dynamic IP Restrictions
- Application Request Routing (ARR)
- Third-party modules

### 6. API Key Rotation
- Implement a process for regular API key rotation
- Use different API keys for different clients
- Monitor API key usage

## Maintenance

### Regular Tasks

1. **Monitor Logs**
   ```powershell
   # Check IIS logs
   Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\*.log" -Tail 100
   
   # Check iisnode logs
   Get-Content "C:\inetpub\wwwroot\tabtabgo-pdf-generator\iisnode\*.log" -Tail 100
   ```

2. **Update Application**
   ```powershell
   cd "C:\inetpub\wwwroot\tabtabgo-pdf-generator"
   
   # Stop application pool
   Stop-WebAppPool -Name "TabTabGoPdfGeneratorAppPool"
   
   # Pull latest changes
   git pull
   
   # Update dependencies
   npm install --production
   
   # Start application pool
   Start-WebAppPool -Name "TabTabGoPdfGeneratorAppPool"
   ```

3. **Backup Configuration**
   ```powershell
   # Backup web.config and .env
   $backupPath = "C:\Backups\pdf-generator-$(Get-Date -Format 'yyyyMMdd')"
   New-Item -ItemType Directory -Path $backupPath
   Copy-Item "C:\inetpub\wwwroot\tabtabgo-pdf-generator\web.config" $backupPath
   Copy-Item "C:\inetpub\wwwroot\tabtabgo-pdf-generator\.env" $backupPath
   ```

## Additional Resources

- [iisnode Documentation](https://github.com/Azure/iisnode)
- [IIS Documentation](https://docs.microsoft.com/en-us/iis/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Puppeteer Documentation](https://pptr.dev/)
- [TabTabGo PDF Generator Repository](https://github.com/TabTabGo/tabtabgo-pdf-generator)

## Support

For issues specific to this application:
- Report issues: [GitHub Issues](https://github.com/TabTabGo/tabtabgo-pdf-generator/issues)
- Check examples: See `EXAMPLES.md` in the repository

For IIS and Windows Server issues:
- [Microsoft IIS Forums](https://forums.iis.net/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/iis)
