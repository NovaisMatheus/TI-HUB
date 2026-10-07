[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Execute como administrador para instalar a confiança HTTPS e o endereço interno do TI Hub.'
}
$hostname = 'ti-hub.192-168-10-9.sslip.io'
$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$hostsText = [IO.File]::ReadAllText($hostsPath)
$matchingLines = $hostsText -split "`r?`n" | Where-Object { ($_ -split '#',2)[0] -match ('(?i)\s' + [regex]::Escape($hostname) + '(\s|$)') }
if ($matchingLines | Where-Object { $_ -notmatch '^\s*192\.168\.10\.9\s' }) {
  throw 'Já existe outro endereço para este nome no arquivo hosts. Revise antes de continuar.'
}
if (-not $matchingLines) {
  Copy-Item -LiteralPath $hostsPath -Destination ($hostsPath + '.ti-hub-' + (Get-Date -Format 'yyyyMMddHHmmss') + '.bak')
  [IO.File]::AppendAllText($hostsPath, "`r`n192.168.10.9 $hostname # UGB TI Hub HTTPS interno`r`n", [Text.Encoding]::ASCII)
}
$certificate = [Security.Cryptography.X509Certificates.X509Certificate2]::new([Convert]::FromBase64String('__CERTIFICATE_BASE64__'))
$store = [Security.Cryptography.X509Certificates.X509Store]::new('Root','LocalMachine')
$store.Open('ReadWrite')
try { $store.Add($certificate) } finally { $store.Close() }
Clear-DnsClientCache
Write-Output "Acesso configurado: https://$hostname. Reinicie o navegador."
Write-Output ('Certificado de confiança instalado: ' + $certificate.Thumbprint)
