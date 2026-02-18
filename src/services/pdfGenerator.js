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

export const generateQuotePDF = async (formData, seller, action = 'download') => {
    try {
        const doc = new jsPDF();

        // Load Font
        try {
            const fontBase64 = await getFontBase64();
            doc.addFileToVFS(`${FONT_NAME}.ttf`, fontBase64);
            doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'normal');
            doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'bold');
            doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'italic');
            doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'bolditalic');
            doc.setFont(FONT_NAME);
            console.log('Font loaded successfully:', FONT_NAME);
        } catch (e) {
            console.warn('Font loading failed, falling back to standard font (accented chars may be wrong)', e);
        }

        const buyerName = formData.buyerName || "Ügyfél";
        const fileName = `arajanlat_${buyerName.replace(/\s+/g, '_')}_${formData.date}.pdf`;

        // --- PDF Content Construction (Migrated from QuoteBuilder) ---

        // Header
        doc.setFontSize(22);
        doc.text("ÁRAJÁNLAT", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.text(`Dátum: ${formData.date}`, 14, 30);
        doc.text(`Érvényes: ${formData.expirationDays} napig`, 14, 35);

        // Seller & Buyer Info
        doc.setFontSize(12);

        // Seller
        doc.setFont(undefined, 'bold'); // Note: 'bold' might strictly require Roboto-Bold if using custom font, but jsPDF often fakes it or falls back.
        // Better: store Regular as 'normal' and maybe fetch Bold too? 
        // For simplicity, we stick to normal font but use logic to simulate bold or accept it might just be normal weight.
        // Actually, jsPDF needs matching font for 'bold' style usually.
        // We will just use 'normal' font weight for now to ensure characters work.

        doc.text("Kivitelező:", 14, 50);
        doc.setFont(undefined, 'normal');
        doc.text(seller.name || "Saját Vállalkozás", 14, 56);
        doc.text(seller.address || "", 14, 62);
        doc.text(`Adószám: ${seller.taxNumber || "-"}`, 14, 68);
        doc.text(`Tel: ${seller.phone || "-"}`, 14, 74);

        // Buyer
        doc.setFont(undefined, 'bold'); // Attempt bold (might verify if it works with single font file)
        doc.text("Megrendelő:", 110, 50);
        doc.setFont(undefined, 'normal');
        doc.text(buyerName, 110, 56);
        doc.text(formData.buyerAddress || "", 110, 62);

        // Table Header
        let y = 100;
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 6, 182, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text("Megnevezés", 16, y);
        doc.text("Menny.", 85, y, { align: 'right' });
        doc.text("Egységár", 110, y, { align: 'right' });
        doc.text("Nettó", 135, y, { align: 'right' });
        doc.text("ÁFA", 155, y, { align: 'right' });
        doc.text("Bruttó", 195, y, { align: 'right' });

        y += 10;
        doc.setFont(undefined, 'normal');

        // Items
        let netTotal = 0;
        let vatTotal = 0;

        formData.items.forEach(item => {
            if (y > 270) {
                doc.addPage();
                y = 20;
                // Re-print header on new page? Optional but good.
            }

            const lineNet = item.qty * item.price;
            let vatRate = item.vat;
            if (typeof vatRate === 'string') vatRate = 0;
            const lineVat = lineNet * (vatRate / 100);
            const lineGross = lineNet + lineVat;

            netTotal += lineNet;
            vatTotal += lineVat;

            doc.text(item.description || "Tétel", 16, y);
            doc.text(`${item.qty} ${item.unit}`, 85, y, { align: 'right' });
            doc.text(`${Number(item.price).toLocaleString()} Ft`, 110, y, { align: 'right' });
            doc.text(`${lineNet.toLocaleString()} Ft`, 135, y, { align: 'right' });

            const vatLabel = typeof item.vat === 'string' ? item.vat : `${item.vat}%`;
            doc.text(vatLabel, 155, y, { align: 'right' });

            doc.text(`${Math.round(lineGross).toLocaleString()} Ft`, 195, y, { align: 'right' });

            y += 8;
        });

        const grossTotal = netTotal + vatTotal;

        // Totals Display
        y += 10;
        doc.line(14, y, 196, y);
        y += 10;
        doc.setFontSize(10);
        doc.text("Nettó összesen:", 135, y, { align: 'right' });
        doc.text(`${netTotal.toLocaleString()} Ft`, 195, y, { align: 'right' });
        y += 6;
        doc.text("ÁFA tartalom:", 135, y, { align: 'right' });
        doc.text(`${vatTotal.toLocaleString()} Ft`, 195, y, { align: 'right' });
        y += 8;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("Bruttó végösszeg:", 135, y, { align: 'right' });
        doc.text(`${grossTotal.toLocaleString()} Ft`, 195, y, { align: 'right' });

        // Note
        if (formData.note) {
            y += 20;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text("Megjegyzés:", 14, y);
            const splitNote = doc.splitTextToSize(formData.note, 180);
            doc.text(splitNote, 14, y + 6);
        }

        // Action Handling
        if (action === 'download') {
            doc.save(fileName);
        } else if (action === 'share') {
            // Mobile Share via Capacitor
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
                dialogTitle: 'Árajánlat küldése',
            });
        }
        return true;

    } catch (error) {
        console.error("PDF Generation Error:", error);
        throw error;
    }
};

export const generateWorksheetPDF = async (project, materials = [], options = { showMaterials: true, showPrices: false }) => {
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

        doc.save(fileName);
        return true;
    } catch (error) {
        console.error("Worksheet PDF Error:", error);
        throw error;
    }
};
