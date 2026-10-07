[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$tlsPath = Join-Path $taskRoot '.local\tls'
$downloadPath = Join-Path $taskRoot 'apps\web\public\downloads'
New-Item -ItemType Directory -Path $tlsPath,$downloadPath -Force | Out-Null
$userSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls $tlsPath /inheritance:r /grant:r ('*' + $userSid + ':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível proteger a pasta dos certificados.' }
$configPath = Join-Path $tlsPath 'config.json'
if (Test-Path -LiteralPath $configPath) {
  Write-Output 'HTTPS já preparado. Certificados existentes preservados.'
  exit 0
}
$hostname = 'ti-hub.192-168-10-9.sslip.io'
$ca = Get-ChildItem 'Cert:\CurrentUser\My' | Where-Object { $_.Subject -eq 'CN=UGB TI Hub - CA da rede local' -and $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date).AddYears(1) } | Sort-Object NotBefore -Descending | Select-Object -First 1
if (-not $ca) {
  $ca = New-SelfSignedCertificate -Type Custom -Subject 'CN=UGB TI Hub - CA da rede local' -KeyAlgorithm RSA -KeyLength 3072 -HashAlgorithm SHA256 -KeyExportPolicy NonExportable -KeyUsage CertSign,CRLSign -CertStoreLocation 'Cert:\CurrentUser\My' -NotAfter (Get-Date).AddYears(5) -TextExtension @('2.5.29.19={critical}{text}ca=1&pathlength=0')
}
$server = Get-ChildItem 'Cert:\CurrentUser\My' | Where-Object { $_.Subject -eq "CN=$hostname" -and $_.Issuer -eq $ca.Subject -and $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date).AddDays(30) } | Sort-Object NotBefore -Descending | Select-Object -First 1
if (-not $server) {
  $server = New-SelfSignedCertificate -Type Custom -Subject "CN=$hostname" -Signer $ca -KeyAlgorithm RSA -KeyLength 3072 -HashAlgorithm SHA256 -KeyExportPolicy Exportable -KeyUsage DigitalSignature,KeyEncipherment -CertStoreLocation 'Cert:\CurrentUser\My' -NotAfter (Get-Date).AddYears(1) -TextExtension @("2.5.29.17={text}DNS=$hostname&IPAddress=192.168.10.9",'2.5.29.37={text}1.3.6.1.5.5.7.3.1','2.5.29.19={critical}{text}ca=0')
}
$passwordBytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($passwordBytes)
$rng.Dispose()
$password = [Convert]::ToBase64String($passwordBytes)
[IO.File]::WriteAllText((Join-Path $tlsPath 'password.txt'), $password)
Export-PfxCertificate -Cert $server -FilePath (Join-Path $tlsPath 'server.pfx') -Password (ConvertTo-SecureString $password -AsPlainText -Force) -ChainOption BuildChain | Out-Null
$publicCA = Join-Path $downloadPath 'ti-hub-rede.cer'
Export-Certificate -Cert $ca -FilePath $publicCA | Out-Null
@{ ip = '192.168.10.9'; hostname = $hostname; caThumbprint = $ca.Thumbprint; serverThumbprint = $server.Thumbprint; expiresAt = $server.NotAfter.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
$certificateBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($publicCA))
$installerTemplate = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'instalar-acesso-https.template.ps1'))
[IO.File]::WriteAllText((Join-Path $downloadPath 'instalar-acesso-ti-hub.ps1'), $installerTemplate.Replace('__CERTIFICATE_BASE64__', $certificateBase64))
Write-Output "HTTPS preparado para https://$hostname e https://192.168.10.9. Nenhuma chave privada foi incluída nos downloads."
