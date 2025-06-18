function showFileInput() {
    const fileInputContainer = document.getElementById('fileInputContainer');
    fileInputContainer.classList.add('show');
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileContent = document.getElementById('fileContent');
    
    if (file) {
        fileName.textContent = file.name;
        fileSize.textContent = `Größe: ${formatFileSize(file.size)}`;
        fileInfo.classList.add('show');
        
        // Dateiinhalt anzeigen
        const reader = new FileReader();
        reader.onload = function(e) {
            fileContent.textContent = e.target.result;
        };
        reader.onerror = function() {
            fileContent.textContent = 'Fehler beim Lesen der Datei.';
        };
        reader.readAsText(file);
    } else {
        fileContent.textContent = '';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 