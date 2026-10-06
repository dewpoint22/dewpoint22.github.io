$port = 8090
$contentRoot = Join-Path $PSScriptRoot 'landing-page'
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "Server running at http://localhost:$port/"

function Get-ContentType([string]$path) {
    switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
        '.html' { 'text/html; charset=utf-8' }
        '.css'  { 'text/css; charset=utf-8' }
        '.js'   { 'application/javascript; charset=utf-8' }
        '.jpg'  { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.png'  { 'image/png' }
        '.svg'  { 'image/svg+xml' }
        default { 'application/octet-stream' }
    }
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            while ($reader.ReadLine()) { }

            $requestPath = '/'
            if ($requestLine -match '^[A-Z]+\s+([^\s?]+)') { $requestPath = $Matches[1] }
            $relativePath = [Uri]::UnescapeDataString($requestPath).TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = 'index.html' }
            if ($relativePath.Contains('..')) { $relativePath = 'index.html' }

            $filePath = Join-Path $contentRoot $relativePath
            if (Test-Path $filePath -PathType Leaf) {
                $body = [System.IO.File]::ReadAllBytes($filePath)
                $status = '200 OK'
                $type = Get-ContentType $filePath
            } else {
                $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
                $status = '404 Not Found'
                $type = 'text/plain; charset=utf-8'
            }

            $header = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($body, 0, $body.Length)
        } finally {
            if ($reader) { $reader.Dispose() }
            if ($client) { $client.Dispose() }
        }
    }
} finally {
    $listener.Stop()
}
