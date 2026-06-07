export interface ParsedItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  unit: string;
  notes: string;
}

export interface ParsedReceipt {
  vendor: string;
  date: string;
  category: 'Sarana Prasarana' | 'Gaji Honorer' | 'Operasional' | 'Buku & Perpus' | 'Kegiatan Siswa' | 'Lainnya';
  items: ParsedItem[];
  ongkir: number;
  pajak: number;
  keterangan: string;
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let vendor = '';
  let date = '2026-06-06';
  let category: ParsedReceipt['category'] = 'Operasional';
  let items: ParsedItem[] = [];
  let ongkir = 0;
  let pajak = 0;
  let keterangan = 'Pemindaian otomatis AI: ';
  
  // 1. Vendor: look at the first few lines
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (/^pt|^cv|^ud|^toko|^warung|^koperasi|^biro/i.test(line)) {
      vendor = line;
      break;
    }
  }
  if (!vendor && lines.length > 0) {
    if (!/nota|faktur|tanggal|no|telp|invoice/i.test(lines[0])) {
      vendor = lines[0];
    } else {
      vendor = 'Vendor Umum';
    }
  }

  // 2. Date
  for (const line of lines) {
    // YYYY-MM-DD
    const matchYmd = line.match(/\b(\d{4})[-\/\.](0[1-9]|1[0-2])[-\/\.](0[1-9]|[12]\d|3[01])\b/);
    if (matchYmd) {
      date = `${matchYmd[1]}-${matchYmd[2]}-${matchYmd[3]}`;
      break;
    }
    // DD-MM-YYYY
    const matchDmy = line.match(/\b(0[1-9]|[12]\d|3[01])[-\/\.](0[1-9]|1[0-2]|Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)[-\/\.](\d{4}|\d{2})\b/i);
    if (matchDmy) {
      let day = matchDmy[1];
      let monthVal = matchDmy[2];
      let year = matchDmy[3];
      if (year.length === 2) year = '20' + year;
      
      const months: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06',
        jul: '07', agu: '08', sep: '09', okt: '10', nov: '11', des: '12'
      };
      const mShort = monthVal.toLowerCase().substring(0, 3);
      const mNum = months[mShort] || (parseInt(monthVal, 10) ? String(monthVal).padStart(2, '0') : '06');
      date = `${year}-${mNum}-${day}`;
      break;
    }
    // Indo month text: e.g. "06 Juni 2026"
    const matchIndoDate = line.match(/\b(0?[1-9]|[12]\d|3[01])\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)\s+(\d{4})\b/i);
    if (matchIndoDate) {
      const day = matchIndoDate[1].padStart(2, '0');
      const mText = matchIndoDate[2].toLowerCase();
      const year = matchIndoDate[3];
      const monthsMap: Record<string, string> = {
        januari: '01', jan: '01',
        februari: '02', feb: '02',
        maret: '03', mar: '03',
        april: '04', apr: '04',
        mei: '05',
        juni: '06', jun: '06',
        juli: '07', jul: '07',
        agustus: '08', agu: '08',
        september: '09', sep: '09',
        oktober: '10', okt: '10',
        november: '11', nov: '11',
        desember: '12', des: '12'
      };
      const mNum = monthsMap[mText] || '06';
      date = `${year}-${mNum}-${day}`;
      break;
    }
  }

  // 3. Category keywords
  const lowerText = text.toLowerCase();
  if (/buku|perpustakaan|kamus|pustaka|modul|novel|majalah/i.test(lowerText)) {
    category = 'Buku & Perpus';
  } else if (/kursi|meja|papan|semen|cat|ac|renovasi|bangunan|lemari|pintu|kayu|atap|paku|besi|keramik/i.test(lowerText)) {
    category = 'Sarana Prasarana';
  } else if (/gaji|honor|insentif|upah|tunjangan|guru|bendahara|staff|karyawan/i.test(lowerText)) {
    category = 'Gaji Honorer';
  } else if (/lomba|osis|pramuka|study|wisuda|olahraga|sertifikat|kegiatan siswa|kesiswaan|pensi/i.test(lowerText)) {
    category = 'Kegiatan Siswa';
  } else if (/listrik|pln|telkom|wifi|internet|atk|spidol|kertas|hvs|pulpen|sapu|sabun|pel|konsumsi|snack|makan|teh|kopi|gula|sembako/i.test(lowerText)) {
    category = 'Operasional';
  } else {
    category = 'Lainnya';
  }

  // 4. Pajak (PPN/PPh)
  const pajakMatches = text.match(/(?:ppn|pph|pajak|tax)\s*(?:11%|12%|10%)?\s*(?:rp\.?)?\s*([\d\.,]+)/i);
  if (pajakMatches) {
    pajak = parseInt(pajakMatches[1].replace(/[\.,]/g, ''), 10) || 0;
  }

  // 5. Ongkir
  const ongkirMatches = text.match(/(?:ongkir|ongkos|kirim|delivery|shipping|kurir)\s*(?:rp\.?)?\s*([\d\.,]+)/i);
  if (ongkirMatches) {
    ongkir = parseInt(ongkirMatches[1].replace(/[\.,]/g, ''), 10) || 0;
  }

  // 6. Find lines with item details
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const qtyMatch = line.match(/(\d+)\s*(pcs|unit|rim|box|lembar|paket|kali|x)\b/i) || line.match(/\b(\d+)\s*@/i);
    const priceMatch = line.match(/(?:rp\.?)?\s*([\d\.,]+000)/i) || line.match(/(?:rp\.?)?\s*([\d\.,]{4,})/i);
    
    if (qtyMatch && priceMatch && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('jumlah') && !line.toLowerCase().includes('ppn') && !line.toLowerCase().includes('pajak')) {
      const qty = parseInt(qtyMatch[1], 10) || 1;
      let price = parseInt(priceMatch[1].replace(/[\.,]/g, ''), 10) || 0;
      
      let itemName = line
        .replace(qtyMatch[0], '')
        .replace(priceMatch[0], '')
        .replace(/@|rp\.?/gi, '')
        .trim();
        
      if (itemName.length < 3 && idx > 0) {
        const prevLine = lines[idx - 1];
        if (!/nota|faktur|tanggal|no|rincian|kepada/i.test(prevLine)) {
          itemName = prevLine;
        }
      }
      
      if (itemName.length > 2) {
        items.push({
          id: `scanned-${Date.now()}-${items.length}`,
          name: itemName.replace(/^\d+[\.\s]*/, '').trim(),
          qty,
          price,
          unit: qtyMatch[2] && qtyMatch[2] !== 'x' ? qtyMatch[2].toLowerCase() : 'pcs',
          notes: ''
        });
      }
    }
  }

  // Fallback: If no items found
  if (items.length === 0) {
    const totalMatches = text.match(/(?:total|grand\s*total|jumlah|bayar|subtotal)\s*(?:rp\.?)?\s*([\d\.,]+)/i);
    let totalVal = 0;
    if (totalMatches) {
      totalVal = parseInt(totalMatches[1].replace(/[\.,]/g, ''), 10) || 0;
    }
    
    let fallbackDesc = '';
    for (const line of lines) {
      if (line.length > 10 && !/nota|faktur|tanggal|no|telp|invoice|rp|total|jumlah|kepada|alamat/i.test(line)) {
        fallbackDesc = line;
        break;
      }
    }
    
    items.push({
      id: `scanned-${Date.now()}-0`,
      name: fallbackDesc || 'Belanja Umum Kuitansi',
      qty: 1,
      price: totalVal > (ongkir + pajak) ? (totalVal - ongkir - pajak) : totalVal,
      unit: 'pcs',
      notes: 'Ekstraksi otomatis'
    });
  }

  keterangan += `Ditemukan vendor: ${vendor}, total item: ${items.length}`;

  return {
    vendor,
    date,
    category,
    items,
    ongkir,
    pajak,
    keterangan
  };
}
