export type Category = 'Purifiers' | 'Dispensers' | 'Pumps' | 'Filters' | 'Spares';

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  dealerPrice: number;
  rating: number;
  reviews: number;
  badge?: string;
  image: string;
  icon: string;
  tint: string;
};

const categoryVisuals: Record<Category, { image: string; icon: string; tint: string }> = {
  Purifiers: {
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=640&q=80',
    icon: '💧',
    tint: '#eaf6fb',
  },
  Dispensers: {
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=640&q=80',
    icon: '🚰',
    tint: '#edf6f4',
  },
  Pumps: {
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=640&q=80',
    icon: '⚙️',
    tint: '#f1f2f6',
  },
  Filters: {
    image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=640&q=80',
    icon: '🧪',
    tint: '#f1f6ec',
  },
  Spares: {
    image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=640&q=80',
    icon: '🔧',
    tint: '#f7f2eb',
  },
};

const inventory: [Category | 'Dispenser', string, number, string?][] = [
  ['Purifiers', 'AquaPure Nova RO + UV', 14990, 'BESTSELLER'],
  ['Purifiers', 'AquaPure Prime Copper', 18490, 'NEW'],
  ['Purifiers', 'AquaPure Lite RO', 10990],
  ['Purifiers', 'AquaPure Max 12L', 12990],
  ['Purifiers', 'AquaPure Alkaline Pro', 21990],
  ['Purifiers', 'AquaPure Smart Sense', 24990],
  ['Purifiers', 'AquaPure UV Shield', 8990],
  ['Purifiers', 'AquaPure Classic UF', 6990],
  ['Purifiers', 'AquaPure Under-sink RO', 16990],
  ['Purifiers', 'AquaPure Villa 15L', 15990],
  ['Dispenser', 'AquaChill Floor Dispenser', 11990, 'POPULAR'],
  ['Dispenser', 'AquaChill Tabletop', 6990],
  ['Dispenser', 'AquaChill Hot + Cold', 14990],
  ['Dispenser', 'AquaChill Bottom Load', 18990],
  ['Dispenser', 'AquaChill Touchless', 9990],
  ['Dispenser', 'AquaChill Mini', 5490],
  ['Dispenser', 'AquaChill Office Pro', 22990],
  ['Dispenser', 'AquaChill Stainless Steel', 16990],
  ['Dispenser', 'AquaChill Bottleless', 25990],
  ['Dispenser', 'AquaChill Wall Mount', 8990],
  ['Pumps', 'AquaFlow Booster 100 GPD', 2490],
  ['Pumps', 'AquaFlow Booster 75 GPD', 2190],
  ['Pumps', 'AquaFlow 150 GPD', 3290, 'TOP RATED'],
  ['Pumps', 'AquaFlow 200 GPD', 4290],
  ['Pumps', 'AquaFlow Pressure Pump', 3890],
  ['Pumps', 'AquaFlow Mini Pump', 1790],
  ['Pumps', 'AquaFlow Auto Cut-off', 2790],
  ['Pumps', 'AquaFlow Silent Pro', 4990],
  ['Pumps', 'AquaFlow 24V DC', 3490],
  ['Pumps', 'AquaFlow Heavy Duty', 5990],
  ['Filters', 'Sediment Filter 10 inch', 390],
  ['Filters', 'Pre-carbon Block Filter', 590],
  ['Filters', 'Post-carbon Taste Filter', 690],
  ['Filters', 'Mineral Enrichment Cartridge', 990, 'BESTSELLER'],
  ['Filters', 'Alkaline Balance Cartridge', 1290],
  ['Filters', 'UF Membrane 0.01 Micron', 1190],
  ['Filters', 'RO Membrane 75 GPD', 1890],
  ['Filters', 'RO Membrane 100 GPD', 2290],
  ['Filters', 'Iron Removal Cartridge', 1490],
  ['Filters', 'UV Lamp 11W', 890],
  ['Spares', 'Smart Faucet with LED', 1890],
  ['Spares', 'Leak Stopper Valve Kit', 490],
  ['Spares', 'Food-grade Tubing 5m', 350],
  ['Spares', 'Storage Tank 8L', 2290],
  ['Spares', 'Storage Tank 12L', 2990],
  ['Spares', 'Faucet Connector Set', 290],
  ['Spares', 'TDS Meter Digital', 790, 'ESSENTIAL'],
  ['Spares', 'Filter Housing 10 inch', 690],
  ['Spares', 'UV Chamber Assembly', 1690],
  ['Spares', 'Auto Shut-off Valve', 550],
];

const normaliseCategory = (category: Category | 'Dispenser'): Category =>
  category === 'Dispenser' ? 'Dispensers' : category;

export const products: Product[] = inventory.map(([rawCategory, name, price, badge], index) => {
  const category = normaliseCategory(rawCategory);
  const visual = categoryVisuals[category];
  return {
    id: `AP-${String(index + 1).padStart(3, '0')}`,
    name,
    category,
    price,
    dealerPrice: Math.round(price * 0.78),
    rating: Number((4.2 + ((index * 7) % 8) / 10).toFixed(1)),
    reviews: 28 + ((index * 19) % 270),
    badge,
    ...visual,
  };
});

export const formatPrice = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`;
