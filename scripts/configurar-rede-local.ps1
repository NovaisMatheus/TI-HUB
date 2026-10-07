[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$resultPath = Join-Path $taskRoot '.local\rede-local-status.json'
try {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Execute este script como administrador do Windows para criar a regra de firewall.'
  }
  if (-not (Get-NetIPAddress -AddressFamily IPv4 -IPAddress '192.168.10.9' -ErrorAction SilentlyContinue)) {
    throw 'O endereço 192.168.10.9 não está configurado neste computador.'
  }
  $ruleName = 'UGB-TI-HUB-LAN-5173'
  if (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue) {
    Set-NetFirewallRule -Name $ruleName -Enabled True -Direction Inbound -Action Allow -Profile Any -Protocol TCP -LocalPort 5173 -LocalAddress '192.168.10.9' -RemoteAddress '192.168.0.0/16' | Out-Null
  } else {
    New-NetFirewallRule -Name $ruleName -DisplayName 'UGB TI Hub - Rede local TCP 5173' -Enabled True -Direction Inbound -Action Allow -Profile Any -Protocol TCP -LocalPort 5173 -LocalAddress '192.168.10.9' -RemoteAddress '192.168.0.0/16' -EdgeTraversalPolicy Block | Out-Null
  }
  if (Test-Path -LiteralPath (Join-Path $taskRoot '.local\tls\config.json')) {
    $httpsRuleName = 'UGB-TI-HUB-LAN-HTTPS-443'
    if (Get-NetFirewallRule -Name $httpsRuleName -ErrorAction SilentlyContinue) {
      Set-NetFirewallRule -Name $httpsRuleName -Enabled True -Direction Inbound -Action Allow -Profile Any -Protocol TCP -LocalPort 443 -LocalAddress '192.168.10.9' -RemoteAddress '192.168.0.0/16' | Out-Null
    } else {
      New-NetFirewallRule -Name $httpsRuleName -DisplayName 'UGB TI Hub - HTTPS rede local TCP 443' -Enabled True -Direction Inbound -Action Allow -Profile Any -Protocol TCP -LocalPort 443 -LocalAddress '192.168.10.9' -RemoteAddress '192.168.0.0/16' -EdgeTraversalPolicy Block | Out-Null
    }
    & (Join-Path $taskRoot 'apps\web\public\downloads\instalar-acesso-ti-hub.ps1')
  }
  @{ success = $true; address = 'http://192.168.10.9:5173'; allowedNetwork = '192.168.0.0/16'; at = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding UTF8
} catch {
  @{ success = $false; message = $_.Exception.Message; at = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding UTF8
  exit 1
}
