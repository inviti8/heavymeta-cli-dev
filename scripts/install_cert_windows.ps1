param(
    [Parameter(Mandatory=$true)]
    [string]$certPath
)

# Add certificate to Windows certificate store
certutil -addstore -f "ROOT" $certPath
