# RABHAN Port Cleanup Script
Write-Host "Cleaning up RABHAN service ports..." -ForegroundColor Green
Write-Host ""

# Define ports for all RABHAN services
$ports = @(3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010)

foreach ($port in $ports) {
    Write-Host "Checking port $port..." -ForegroundColor Yellow
    
    # Get processes using this port
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($connections) {
        foreach ($conn in $connections) {
            $processId = $conn.OwningProcess
            try {
                $process = Get-Process -Id $processId -ErrorAction Stop
                Write-Host "  Found process $($process.Name) (PID: $processId) - terminating..." -ForegroundColor Red
                Stop-Process -Id $processId -Force
                Write-Host "  Process $processId terminated successfully" -ForegroundColor Green
            }
            catch {
                Write-Host "  Warning: Could not terminate process $processId" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  Port $port is free" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Port cleanup completed!" -ForegroundColor Green
Write-Host ""