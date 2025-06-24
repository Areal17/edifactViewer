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

// Erweiterte EDIFACT-Parser-Funktion für Rechnungen (INVOIC)
function parseEdifactInvoice(edifactText) {
    // Trenne Segmente - EDIFACT verwendet ' als Segment-Terminator
    const segments = edifactText.split("'").map(s => s.trim()).filter(Boolean);
    let invoiceNumber = '', invoiceDate = '', dueDate = '', orderRef = '', sender = '', receiver = '', 
        senderAddress = '', receiverAddress = '', totalAmount = '', netAmount = '', taxAmount = '', 
        currency = '', positions = [];
    let currentPosition = null;

    segments.forEach(seg => {
        if (seg.startsWith('BGM')) {
            // BGM+380+Rechnungsnummer+9'
            const parts = seg.split('+');
            invoiceNumber = parts[2] || '';
        }
        if (seg.startsWith('DTM')) {
            const parts = seg.split('+');
            if (parts[1]) {
                if (parts[1].startsWith('137:')) {
                    // Rechnungsdatum
                    invoiceDate = formatDate(parts[1].split(':')[1] || '');
                } else if (parts[1].startsWith('35:')) {
                    // Fälligkeitsdatum
                    dueDate = formatDate(parts[1].split(':')[1] || '');
                }
            }
        }
        if (seg.startsWith('RFF+ON')) {
            // Bestellreferenz
            const parts = seg.split(':');
            orderRef = parts[1] || '';
        }
        if (seg.startsWith('NAD+BY')) {
            // Käufer/Empfänger
            const parts = seg.split('+');
            receiver = parts[4] || '';
            if (parts.length > 5) {
                receiverAddress = parts.slice(5, 9).filter(Boolean).join(', ');
            }
        }
        if (seg.startsWith('NAD+IV')) {
            // Rechnungsempfänger (falls anders als Käufer)
            const parts = seg.split('+');
            if (!receiver) receiver = parts[4] || '';
            if (!receiverAddress && parts.length > 5) {
                receiverAddress = parts.slice(5, 9).filter(Boolean).join(', ');
            }
        }
        if (seg.startsWith('NAD+SU')) {
            // Lieferant/Absender
            const parts = seg.split('+');
            sender = parts[4] || '';
            if (parts.length > 5) {
                senderAddress = parts.slice(5, 9).filter(Boolean).join(', ');
            }
        }
        if (seg.startsWith('CUX')) {
            // CUX+2:EUR:9'
            const parts = seg.split(':');
            currency = parts[1] || '';
        }
        if (seg.startsWith('LIN')) {
            // Neue Position
            currentPosition = { 
                number: '', 
                article: '', 
                description: '', 
                qty: '', 
                unit: '', 
                price: '', 
                lineAmount: '',
                taxRate: ''
            };
            const parts = seg.split('+');
            currentPosition.number = parts[1] || '';
            if (parts[3]) {
                currentPosition.article = parts[3].split(':')[0] || '';
            }
            positions.push(currentPosition);
        }
        if (seg.startsWith('IMD+F') && currentPosition) {
            // Produktbeschreibung
            const parts = seg.split(':::');
            if (parts[1]) {
                currentPosition.description = parts[1];
            }
        }
        if (seg.startsWith('QTY+47') && currentPosition) {
            // Menge
            const parts = seg.split('+');
            if (parts[2]) {
                const qtyParts = parts[2].split(':');
                currentPosition.qty = qtyParts[0] || '';
                currentPosition.unit = qtyParts[2] || '';
            }
        }
        if (seg.startsWith('PRI+INV') && currentPosition) {
            // Preis
            const parts = seg.split(':');
            currentPosition.price = parts[1] || '';
        }
        if (seg.startsWith('MOA+203') && currentPosition) {
            // Zeilenbetrag
            const parts = seg.split(':');
            currentPosition.lineAmount = parts[1] || '';
        }
        if (seg.startsWith('TAX+7+VAT') && currentPosition) {
            // Steuersatz für Position
            const parts = seg.split(':::');
            if (parts[1]) {
                currentPosition.taxRate = parts[1].split('+')[0] || '';
            }
        }
        if (seg.startsWith('MOA+79')) {
            // Nettobetrag
            const parts = seg.split(':');
            netAmount = parts[1] || '';
        }
        if (seg.startsWith('MOA+125')) {
            // Steuerbetrag
            const parts = seg.split(':');
            taxAmount = parts[1] || '';
        }
        if (seg.startsWith('MOA+86')) {
            // Gesamtbetrag
            const parts = seg.split(':');
            totalAmount = parts[1] || '';
        }
    });

    // HTML-Ausgabe mit erweiterten Informationen
    let html = `<h3>Rechnung ${invoiceNumber}</h3>`;
    html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">`;
    
    // Rechnungsdetails
    html += `<div><h4>Rechnungsdetails</h4><table style="width:100%">`;
    html += `<tr><td><b>Rechnungsnummer:</b></td><td>${invoiceNumber}</td></tr>`;
    html += `<tr><td><b>Rechnungsdatum:</b></td><td>${invoiceDate}</td></tr>`;
    if (dueDate) html += `<tr><td><b>Fälligkeitsdatum:</b></td><td>${dueDate}</td></tr>`;
    if (orderRef) html += `<tr><td><b>Bestellreferenz:</b></td><td>${orderRef}</td></tr>`;
    html += `</table></div>`;
    
    // Adressinformationen
    html += `<div><h4>Adressen</h4><table style="width:100%">`;
    html += `<tr><td><b>Absender:</b></td><td>${sender}<br><small>${senderAddress}</small></td></tr>`;
    html += `<tr><td><b>Empfänger:</b></td><td>${receiver}<br><small>${receiverAddress}</small></td></tr>`;
    html += `</table></div></div>`;
    
    // Positionen
    html += `<h4>Positionen</h4>`;
    html += `<table style="width:100%;border-collapse:collapse;margin-bottom:20px">`;
    html += `<thead><tr style="background:#f5f5f5">`;
    html += `<th style='border:1px solid #ddd;padding:8px'>Pos</th>`;
    html += `<th style='border:1px solid #ddd;padding:8px'>Artikel</th>`;
    html += `<th style='border:1px solid #ddd;padding:8px'>Beschreibung</th>`;
    html += `<th style='border:1px solid #ddd;padding:8px'>Menge</th>`;
    html += `<th style='border:1px solid #ddd;padding:8px'>Preis</th>`;
    html += `<th style='border:1px solid #ddd;padding:8px'>Betrag</th>`;
    html += `</tr></thead><tbody>`;
    
    positions.forEach((pos) => {
        html += `<tr>`;
        html += `<td style='border:1px solid #ddd;padding:8px'>${pos.number}</td>`;
        html += `<td style='border:1px solid #ddd;padding:8px'>${pos.article}</td>`;
        html += `<td style='border:1px solid #ddd;padding:8px'>${pos.description}</td>`;
        html += `<td style='border:1px solid #ddd;padding:8px'>${pos.qty} ${pos.unit}</td>`;
        html += `<td style='border:1px solid #ddd;padding:8px'>${pos.price} ${currency}</td>`;
        html += `<td style='border:1px solid #ddd;padding:8px'>${pos.lineAmount} ${currency}</td>`;
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    
    // Summen
    html += `<div style="text-align:right;margin-top:20px">`;
    html += `<table style="margin-left:auto;border-collapse:collapse">`;
    if (netAmount) html += `<tr><td style="padding:4px 8px"><b>Nettobetrag:</b></td><td style="padding:4px 8px;text-align:right">${netAmount} ${currency}</td></tr>`;
    if (taxAmount) html += `<tr><td style="padding:4px 8px"><b>MwSt.:</b></td><td style="padding:4px 8px;text-align:right">${taxAmount} ${currency}</td></tr>`;
    html += `<tr style="border-top:2px solid #333"><td style="padding:4px 8px"><b>Gesamtbetrag:</b></td><td style="padding:4px 8px;text-align:right;font-weight:bold">${totalAmount} ${currency}</td></tr>`;
    html += `</table></div>`;
    
    return html;
}

// Hilfsfunktion für Datumsformatierung
function formatDate(dateString) {
    if (dateString.length === 8) {
        return `${dateString.substr(6,2)}.${dateString.substr(4,2)}.${dateString.substr(0,4)}`;
    }
    return dateString;
}