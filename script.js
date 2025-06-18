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
            const edifactText = e.target.result;
            const html = parseEdifactInvoice(edifactText);
            fileContent.innerHTML = html;
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

// Einfache EDIFACT-Parser-Funktion für Rechnungen (INVOIC)
function parseEdifactInvoice(edifactText) {
    // Trenne Segmente (meist mit \'\' oder manchmal mit nur \n)
    const segments = edifactText.split("'").map(s => s.trim()).filter(Boolean);
    let invoiceNumber = '', invoiceDate = '', sender = '', receiver = '', totalAmount = '', currency = '', positions = [];

    segments.forEach(seg => {
        if (seg.startsWith('BGM')) {
            // BGM+380+Rechnungsnummer+9'
            const parts = seg.split('+');
            invoiceNumber = parts[2] || '';
        }
        if (seg.startsWith('DTM')) {
            // DTM+137:20240601:102'
            const parts = seg.split('+');
            if (parts[1] && parts[1].startsWith('137:')) {
                invoiceDate = parts[1].split(':')[1] || '';
            }
        }
        if (seg.startsWith('NAD+BY')) {
            // NAD+BY+Kundennummer::9++Empfängername'
            const parts = seg.split('+');
            receiver = parts[4] || '';
        }
        if (seg.startsWith('NAD+SU')) {
            // NAD+SU+Lieferantennummer::9++Absendername'
            const parts = seg.split('+');
            sender = parts[4] || '';
        }
        if (seg.startsWith('MOA+9')) {
            // MOA+9+Gesamtbetrag'
            const parts = seg.split('+');
            totalAmount = parts[2] || '';
        }
        if (seg.startsWith('CUX')) {
            // CUX+2:EUR:9'
            const parts = seg.split(':');
            currency = parts[1] || '';
        }
        if (seg.startsWith('LIN')) {
            // LIN+1++Artikelnummer:EN'
            const line = { number: '', article: '', qty: '', price: '' };
            const parts = seg.split('+');
            line.number = parts[1] || '';
            line.article = (parts[3] || '').split(':')[0] || '';
            positions.push(line);
        }
        if (seg.startsWith('QTY+47')) {
            // QTY+47+Menge'
            if (positions.length > 0) {
                const parts = seg.split('+');
                positions[positions.length-1].qty = parts[2] || '';
            }
        }
        if (seg.startsWith('PRI+AAA')) {
            // PRI+AAA+Preis'
            if (positions.length > 0) {
                const parts = seg.split('+');
                positions[positions.length-1].price = parts[2] || '';
            }
        }
    });

    // HTML-Ausgabe
    let html = `<h3>Rechnung</h3><table style="width:100%;margin-bottom:1em"><tr><td><b>Rechnungsnummer:</b></td><td>${invoiceNumber}</td></tr><tr><td><b>Datum:</b></td><td>${invoiceDate}</td></tr><tr><td><b>Absender:</b></td><td>${sender}</td></tr><tr><td><b>Empfänger:</b></td><td>${receiver}</td></tr></table>`;
    html += `<table style="width:100%;border-collapse:collapse"><thead><tr><th style='border-bottom:1px solid #ccc'>Pos</th><th style='border-bottom:1px solid #ccc'>Artikel</th><th style='border-bottom:1px solid #ccc'>Menge</th><th style='border-bottom:1px solid #ccc'>Preis</th></tr></thead><tbody>`;
    positions.forEach((pos, idx) => {
        html += `<tr><td>${pos.number}</td><td>${pos.article}</td><td>${pos.qty}</td><td>${pos.price}</td></tr>`;
    });
    html += `</tbody></table>`;
    html += `<div style='margin-top:1em'><b>Gesamtbetrag:</b> ${totalAmount} ${currency}</div>`;
    return html;
} 