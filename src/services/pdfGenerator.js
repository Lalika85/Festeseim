import { jsPDF } from 'jspdf';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const FONT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
const FONT_NAME = 'Roboto-Regular';
const CACHE_KEY = 'cached_font_roboto';

async function getFontBase64() {
    // 1. Check LocalStorage
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        return cached;
    }

    // 2. Fetch from CDN
    try {
        const response = await fetch(FONT_URL);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result.split(',')[1];
                try {
                    localStorage.setItem(CACHE_KEY, base64data);
                } catch (e) {
                    console.warn('Failed to cache font in LocalStorage (quota exceeded?)', e);
                }
                resolve(base64data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.error('Error fetching font:', err);
        throw new Error('Nem sikerült letölteni a betűtípust (internet szükséges az első alkalommal).');
    }
}

// Helper to ensure image is in a format jsPDF likes (JPEG) and is fully loaded
const processImage = async (pathOrData) => {
    if (!pathOrData) return null;

    let dataUrl = pathOrData;

    // Handle filesystem paths on native devices
    if (pathOrData.startsWith('file://')) {
        try {
            const file = await Filesystem.readFile({
                path: pathOrData
            });
            // Construct data URL from base64
            // Note: We assume PNG/JPEG as it's a logo
            dataUrl = `data:image/png;base64,${file.data}`;
        } catch (err) {
            console.error("Error reading image from filesystem:", err);
            return null;
        }
    }

    if (!dataUrl || !dataUrl.startsWith('data:image')) return null;
    
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                // Maintain aspect ratio but cap size for PDF performance
                const maxDim = 1200;
                let width = img.width;
                let height = img.height;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = (height / width) * maxDim;
                        width = maxDim;
                    } else {
                        width = (width / height) * maxDim;
                        height = maxDim;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height); // White background for transparency
                ctx.drawImage(img, 0, 0, width, height);
                resolve({
                    data: canvas.toDataURL('image/jpeg', 0.85),
                    width: width,
                    height: height
                });
            } catch (e) {
                console.error("Canvas processing failed", e);
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
    });
};

const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
};

export const generateQuotePDF = async (formData, seller, action = 'download') => {
    try {
        const doc = new jsPDF();
        const primaryColor = seller.primaryColor || '#2563eb';
        const [r, g, b] = hexToRgb(primaryColor);

        // Load Font
        try {
            const fontBase64 = await getFontBase64();
            doc.addFileToVFS(`${FONT_NAME}.ttf`, fontBase64);
            doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'normal');
            doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'bold');
            doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'italic');
            doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'bolditalic');
            doc.setFont(FONT_NAME);
        } catch (e) {
            console.warn('Font loading failed');
        }

        const buyerName = formData.clientName || formData.buyerName || "Ügyfél";
        const quoteDate = formData.date || formData.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
        const fileName = `arajanlat_${buyerName.replace(/\s+/g, '_')}_${quoteDate}.pdf`;

        // 1. TOP BRANDED STRIP (Mimicking Preview)
        doc.setFillColor(r, g, b);
        doc.rect(0, 0, 210, 4, 'F');

        // 2. HEADER: Logo (Left) and Doc Info (Right)
        let y = 20;
        
        // Logo or Fallback Title
        if (seller.logo) {
            const processed = await processImage(seller.logo);
            if (processed) {
                const displayWidth = 45;
                const displayHeight = (processed.height / processed.width) * displayWidth;
                const finalHeight = Math.min(displayHeight, 30);
                doc.addImage(processed.data, 'JPEG', 14, y, displayWidth, finalHeight, undefined, 'FAST');
                y += finalHeight + 10;
            } else {
                doc.setFontSize(24);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(r, g, b);
                doc.text("ÁRAJÁNLAT", 14, y + 10);
                doc.setTextColor(0, 0, 0);
                y += 25;
            }
        } else {
            doc.setFontSize(24);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(r, g, b);
            doc.text("ÁRAJÁNLAT", 14, y + 10);
            doc.setTextColor(0, 0, 0);
            y += 25;
        }

        // Right side info (Quote Number)
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.setFont(undefined, 'bold');
        doc.text("DOKUMENTUM ADATAI", 196, 20, { align: 'right' });
        
        doc.setFontSize(28);
        doc.setTextColor(30, 30, 30);
        doc.text(formData.number || "#0001", 196, 32, { align: 'right' });
        
        // Date and Expiration boxes
        doc.setFillColor(248, 250, 252); // Very light gray/blue
        doc.rect(140, 38, 56, 18, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.rect(140, 38, 56, 18, 'S');
        
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("DÁTUM:", 145, 45);
        doc.text("ÉRVÉNYESSÉG:", 145, 51);
        
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.setFont(undefined, 'bold');
        doc.text(quoteDate, 190, 45, { align: 'right' });
        doc.text(`${formData.expirationDays || 15} nap`, 190, 51, { align: 'right' });

        // Reset text color
        doc.setTextColor(0, 0, 0);
        
        // 3. SELLER & BUYER SECTIONS (Two columns)
        y = Math.max(y, 65);
        
        // Left Column: Seller (Kivitelező)
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(r, g, b);
        doc.text("KIVITELEZŐ", 14, y);
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(seller.name || "Saját Vállalkozás", 14, y + 7);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(seller.address || "", 14, y + 13);
        doc.text(`Adószám: ${seller.taxNumber || "-"}`, 14, y + 18);
        doc.text(`Tel: ${seller.phone || "-"}`, 14, y + 23);
        if (seller.email) doc.text(`Email: ${seller.email}`, 14, y + 28);
        if (seller.bank) doc.text(`Bankszámla: ${seller.bank}`, 14, y + 33);

        // Right Column: Buyer (Megrendelő) - Boxed
        doc.setFillColor(248, 250, 252);
        doc.rect(110, y - 5, 86, 35, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(110, y - 5, 86, 35, 'S');
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(150, 150, 150);
        doc.text("MEGRENDELŐ", 115, y);
        
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.text(buyerName, 115, y + 8);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(formData.clientAddress || formData.buyerAddress || "Nincs cím", 115, y + 14);
        if (formData.buyerEmail) doc.text(formData.buyerEmail, 115, y + 19);

        y += 45;

        // 4. ITEMS TABLE
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(14, y, 196, y);
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text("TÉTEL MEGNEVEZÉSE", 14, y + 6);
        doc.text("MENNY.", 90, y + 6, { align: 'right' });
        doc.text("EGYSÉGÁR", 122, y + 6, { align: 'right' });
        doc.text("NETTÓ", 152, y + 6, { align: 'right' });
        doc.text("ÁFA", 172, y + 6, { align: 'right' });
        doc.text("BRUTTÓ", 196, y + 6, { align: 'right' });
        
        doc.setLineWidth(0.1);
        doc.line(14, y + 10, 196, y + 10);
        
        y += 18;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);

        let netTotal = 0;
        let vatTotal = 0;

        formData.items.forEach((item, index) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            const lineNet = item.qty * item.price;
            let vatRate = item.vat;
            if (typeof vatRate === 'string') vatRate = 0;
            const lineVat = lineNet * (vatRate / 100);
            const lineGross = lineNet + lineVat;

            netTotal += lineNet;
            vatTotal += lineVat;

            doc.setFont(undefined, 'bold');
            doc.text(item.description || "Tétel", 14, y);
            
            doc.setFont(undefined, 'normal');
            doc.text(`${item.qty} ${item.unit}`, 90, y, { align: 'right' });
            doc.text(`${Number(item.price).toLocaleString()} Ft`, 122, y, { align: 'right' });
            doc.text(`${lineNet.toLocaleString()} Ft`, 152, y, { align: 'right' });

            const vatLabel = typeof item.vat === 'string' ? item.vat : `${item.vat}%`;
            doc.text(vatLabel, 172, y, { align: 'right' });

            doc.setFont(undefined, 'bold');
            doc.text(`${Math.round(lineGross).toLocaleString()} Ft`, 196, y, { align: 'right' });

            if (item.isOptional) {
                doc.setFontSize(7);
                doc.setTextColor(245, 158, 11);
                doc.text("OPCIONÁLIS TÉTEL", 14, y + 4);
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                y += 10;
            } else {
                y += 8;
            }
            
            doc.setDrawColor(241, 245, 249);
            doc.line(14, y - 2, 196, y - 2);
        });

        const grossTotal = netTotal + vatTotal;

        // 5. TOTALS (Mimicking the dark box in Preview)
        y += 10;
        if (y > 230) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(150, 150, 150);
        doc.text("NETTÓ ÖSSZESEN:", 160, y, { align: 'right' });
        doc.setTextColor(50, 50, 50);
        doc.text(`${netTotal.toLocaleString()} Ft`, 196, y, { align: 'right' });
        
        y += 6;
        doc.setTextColor(150, 150, 150);
        doc.text("ÁFA ÖSSZESEN:", 160, y, { align: 'right' });
        doc.setTextColor(50, 50, 50);
        doc.text(`${vatTotal.toLocaleString()} Ft`, 196, y, { align: 'right' });
        
        y += 10;
        // The Dark Total Box
        doc.setFillColor(15, 23, 42); // slate-900
        doc.roundedRect(120, y, 76, 18, 3, 3, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("BRUTTÓ VÉGÖSSZEG", 126, y + 7);
        
        doc.setFontSize(18);
        doc.text(`${grossTotal.toLocaleString()} Ft`, 192, y + 12, { align: 'right' });

        // 6. NOTE
        if (formData.note) {
            y += 35;
            if (y > 260) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.setFont(undefined, 'bold');
            doc.text("MEGJEGYZÉSEK & FELTÉTELEK", 14, y);
            
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(241, 245, 249);
            
            const splitNote = doc.splitTextToSize(formData.note, 175);
            const boxHeight = (splitNote.length * 5) + 8;
            
            doc.roundedRect(14, y + 3, 182, boxHeight, 3, 3, 'F');
            doc.setTextColor(71, 85, 105);
            doc.setFont(undefined, 'normal');
            doc.text(splitNote, 18, y + 9);
        }

        // 7. FOOTER
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(203, 213, 225);
        doc.text(`${quoteDate}  •  ${seller.name || "Saját Vállalkozás"}`, 105, pageHeight - 10, { align: 'center' });

        // Action Handling
        if (action === 'download' || action === 'share') {
            try {
                const base64PDF = doc.output('datauristring').split(',')[1];
                await Filesystem.writeFile({
                    path: fileName,
                    data: base64PDF,
                    directory: Directory.Cache,
                });
                const fileResult = await Filesystem.getUri({
                    directory: Directory.Cache,
                    path: fileName,
                });
                
                await Share.share({
                    title: `Árajánlat: ${buyerName}`,
                    text: `Csatolva küldöm az árajánlatot.`,
                    files: [fileResult.uri],
                    dialogTitle: 'Árajánlat letöltése vagy megosztása',
                });
            } catch (nativeErr) {
                console.error("Native share/save failed, falling back to doc.save():", nativeErr);
                doc.save(fileName);
            }
        }
        return true;

    } catch (error) {
        console.error("PDF Generation Error:", error);
        throw error;
    }
};

export const generateWorksheetPDF = async (project, materials = [], options = { showMaterials: true, showPrices: false }, action = 'download') => {
    try {
        const doc = new jsPDF();

        // Load Font
        try {
            const fontBase64 = await getFontBase64();
            doc.addFileToVFS(`${FONT_NAME}.ttf`, fontBase64);
            doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'normal');
            doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'bold');
            doc.setFont(FONT_NAME, 'normal');
        } catch (e) {
            console.warn('Font loading failed', e);
        }

        const fileName = `munkalap_${(project.client || 'ugyfel').replace(/\s+/g, '_')}.pdf`;

        // Title
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text("MUNKALAP - ADATLAP", 105, 20, { align: "center" });

        // Client Info
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');

        let y = 40;
        doc.text(`Ügyfél: ${project.client || '-'}`, 14, y); y += 7;
        doc.text(`Cím: ${project.address || '-'}`, 14, y); y += 7;
        doc.text(`Tel: ${project.phone || '-'}`, 14, y); y += 7;
        doc.text(`Email: ${project.email || '-'}`, 14, y); y += 10;

        doc.line(14, y, 196, y); y += 10;

        // Rooms
        doc.setFont(undefined, 'bold');
        doc.text("HELYISÉGEK:", 14, y); y += 8;
        doc.setFont(undefined, 'normal');

        (project.rooms || []).forEach((r, idx) => {
            // Handle both string and object formats for rooms
            const name = typeof r === 'object' ? r.name : r;
            const size = typeof r === 'object' && r.size ? ` (${r.size} m²)` : '';
            const comment = typeof r === 'object' && r.comment ? ` - ${r.comment}` : '';

            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(`${idx + 1}. ${name}${size}${comment}`, 14, y);
            y += 7;
        });

        y += 5;

        // Note
        if (project.note) {
            if (y > 250) { doc.addPage(); y = 20; }
            y += 5;
            doc.setFont(undefined, 'bold');
            doc.text("MEGJEGYZÉS:", 14, y); y += 7;
            doc.setFont(undefined, 'normal');
            const splitNote = doc.splitTextToSize(project.note || "", 180);
            doc.text(splitNote, 14, y);
            y += (splitNote.length * 7) + 5;
        }

        // Materials
        if (options.showMaterials && materials.length > 0) {
            if (y > 250) { doc.addPage(); y = 20; }
            y += 10;
            doc.line(14, y, 196, y); y += 10;

            doc.setFont(undefined, 'bold');
            doc.text("ANYAGSZÜKSÉGLET:", 14, y); y += 10;

            // Header
            doc.setFillColor(240, 240, 240);
            doc.rect(14, y - 6, 182, 8, 'F');
            doc.setFontSize(10);
            doc.text("Megnevezés", 16, y);
            doc.text("Menny.", 100, y, { align: "right" });
            if (options.showPrices) {
                doc.text("Ár (db)", 140, y, { align: "right" });
                doc.text("Összesen", 190, y, { align: "right" });
            }
            y += 10;
            doc.setFont(undefined, 'normal');

            let totalCost = 0;

            materials.forEach(item => {
                if (y > 270) { doc.addPage(); y = 20; }

                doc.text(item.product, 16, y);
                doc.text(`${item.qty} ${item.unit}`, 100, y, { align: "right" });

                if (options.showPrices) {
                    const price = parseInt(item.price || 0);
                    const lineTotal = price * item.qty;
                    totalCost += lineTotal;

                    doc.text(`${price.toLocaleString()} Ft`, 140, y, { align: "right" });
                    doc.text(`${lineTotal.toLocaleString()} Ft`, 190, y, { align: "right" });
                }
                y += 7;
            });

            if (options.showPrices) {
                y += 5;
                doc.line(14, y, 196, y); y += 7;
                doc.setFont(undefined, 'bold');
                doc.text("Becsült anyagköltség:", 140, y, { align: "right" });
                doc.text(`${totalCost.toLocaleString()} Ft`, 190, y, { align: "right" });
            }
        }

        // Action Handling for Worksheet
        if (action === 'download' || action === 'share') {
            try {
                const base64PDF = doc.output('datauristring').split(',')[1];
                await Filesystem.writeFile({
                    path: fileName,
                    data: base64PDF,
                    directory: Directory.Cache,
                });
                const fileResult = await Filesystem.getUri({
                    directory: Directory.Cache,
                    path: fileName,
                });

                await Share.share({
                    title: `Munkalap: ${project.client}`,
                    text: `Csatolva küldöm a munkalapot.`,
                    files: [fileResult.uri],
                    dialogTitle: 'Munkalap letöltése/megosztása',
                });
            } catch (nativeErr) {
                console.error("Native save failed, falling back to doc.save", nativeErr);
                doc.save(fileName);
            }
        } else {
            doc.save(fileName);
        }

        return true;
    } catch (error) {
        console.error("Worksheet PDF Error:", error);
        throw error;
    }
};
