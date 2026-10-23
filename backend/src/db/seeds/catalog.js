// Demo stores and products. Stock per store is listed in the same order as STORES.
export const STORES = [
  { code: 'BLR-IND', name: 'RetailPulse Indiranagar', city: 'Bengaluru', address: '100 Feet Road, Indiranagar' },
  { code: 'MUM-AND', name: 'RetailPulse Andheri', city: 'Mumbai', address: 'Link Road, Andheri West' },
  { code: 'DEL-CP', name: 'RetailPulse Connaught Place', city: 'Delhi', address: 'Block F, Connaught Place' },
];

// [sku, name, category, brand, price (INR), description, [stock BLR, MUM, DEL]]
export const PRODUCTS = [
  ['LAP-AERO14', 'Aero 14 Ultrabook', 'laptop', 'Aero', 64990, '14-inch ultrabook, Ryzen 5, 16GB RAM, 512GB SSD. Light at 1.3kg with 12-hour battery.', [8, 3, 0]],
  ['LAP-NOVA15', 'Nova 15 Everyday Laptop', 'laptop', 'Nova', 42990, '15.6-inch laptop, Core i5, 8GB RAM, 512GB SSD. Great for study and office work.', [12, 9, 6]],
  ['LAP-TITAN16', 'Titan 16 Gaming Laptop', 'laptop', 'Titan', 109990, '16-inch gaming laptop, RTX 4060, 16GB RAM, 1TB SSD, 165Hz display.', [2, 0, 1]],
  ['LAP-PRO13', 'ProBook 13 Business Laptop', 'laptop', 'ProBook', 78990, '13-inch business laptop, Core i7, 16GB RAM, 512GB SSD, fingerprint reader.', [4, 5, 0]],
  ['LAP-CHROME', 'Chrome Go 14 Laptop', 'laptop', 'Nova', 27990, '14-inch ChromeOS laptop, 8GB RAM, 128GB storage. Ideal for students.', [15, 11, 14]],
  ['HP-SONIC-ANC', 'Sonic ANC Wireless Headphones', 'headphones', 'Sonic', 12990, 'Over-ear Bluetooth headphones with active noise cancellation and 40-hour battery.', [14, 0, 7]],
  ['HP-BASSX', 'BassX Over-Ear Headphones', 'headphones', 'BassX', 4999, 'Wireless over-ear headphones with deep bass and 30-hour battery.', [25, 18, 20]],
  ['HP-STUDIO', 'Studio Pro Wired Headphones', 'headphones', 'Sonic', 8490, 'Wired studio monitor headphones with detachable cable.', [5, 2, 0]],
  ['EB-AIRPOD', 'AirBuds Mini True Wireless Earbuds', 'earbuds', 'AirBuds', 2999, 'True wireless earbuds with charging case and 24-hour total playtime.', [40, 30, 35]],
  ['EB-SPORT', 'SportFit Neckband Earphones', 'earbuds', 'AirBuds', 1499, 'Sweat-resistant Bluetooth neckband earphones for workouts.', [0, 22, 18]],
  ['PH-ZENITH5', 'Zenith 5 Smartphone', 'smartphone', 'Zenith', 29999, '6.5-inch AMOLED, 128GB, 50MP camera, 5000mAh battery.', [10, 12, 9]],
  ['PH-ZENITHPRO', 'Zenith Pro Max Smartphone', 'smartphone', 'Zenith', 74999, '6.8-inch LTPO display, 256GB, triple 108MP camera, 120W charging.', [3, 4, 0]],
  ['PH-LITE', 'Lumo Lite Smartphone', 'smartphone', 'Lumo', 11999, '6.5-inch display, 64GB, 13MP camera. Budget-friendly everyday phone.', [20, 17, 25]],
  ['TAB-SLATE10', 'Slate 10 Tablet', 'tablet', 'Slate', 21999, '10.4-inch tablet, 64GB, stylus support, 8000mAh battery.', [6, 0, 8]],
  ['WAT-FIT3', 'FitBand 3 Smartwatch', 'smartwatch', 'FitBand', 5499, 'AMOLED fitness smartwatch with heart-rate, SpO2 and 14-day battery.', [18, 15, 12]],
  ['SPK-BOOM', 'Boomer Portable Bluetooth Speaker', 'speaker', 'BassX', 3499, 'Waterproof portable speaker, 12-hour playtime, 20W output.', [16, 0, 9]],
  ['MON-27QHD', 'ViewMax 27 QHD Monitor', 'monitor', 'ViewMax', 18990, '27-inch QHD IPS monitor, 75Hz, HDMI and DisplayPort.', [7, 5, 3]],
  ['KB-MECH', 'ClickPro Mechanical Keyboard', 'accessory', 'ClickPro', 3999, 'Hot-swappable mechanical keyboard with RGB backlight.', [13, 10, 0]],
  ['MS-ERGO', 'Glide Ergonomic Wireless Mouse', 'accessory', 'ClickPro', 1799, 'Ergonomic wireless mouse, silent clicks, 12-month battery.', [30, 21, 26]],
  ['CAM-ACTION', 'Venture 4K Action Camera', 'camera', 'Venture', 14990, '4K/60 waterproof action camera with image stabilisation.', [2, 3, 0]],
];
