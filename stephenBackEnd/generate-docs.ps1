$date = Get-Date -Format "MMMM dd, yyyy"
yarn exec typedoc --skipErrorChecking --customFooterHtml "Generated: $date"
.\copy-docs.bat
