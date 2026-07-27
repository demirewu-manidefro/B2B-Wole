import React from 'react';
import { 
  Menu, 
  Car, 
  Refrigerator, 
  Shirt, 
  Armchair, 
  Gamepad2, 
  Footprints, 
  HeartHandshake, 
  Scissors, 
  PawPrint, 
  Gem, 
  Smartphone,
  ShoppingBag
} from 'lucide-react';

export default function CategorySidebar({ activeCategory = 'Appliances', onSelectCategory }) {
  const categories = [
    { id: 'automotive', label: 'Automotive', icon: Car, slug: null },
    { id: 'appliances', label: 'Appliances', icon: Refrigerator, slug: 'solar-power-inverters' },
    { id: 'womens-clothing', label: "Women's Clothing", icon: ShoppingBag, slug: 'traditional-habesha-wear' },
    { id: 'mens-clothing', label: "Men's Clothing", icon: Shirt, slug: 'modern-denim-outerwear' },
    { id: 'furniture', label: 'Furniture', icon: Armchair, slug: 'resort-suites-rooms' },
    { id: 'toys-games', label: 'Toys & Games', icon: Gamepad2, slug: null },
    { id: 'shoes', label: 'Shoes', icon: Footprints, slug: null },
    { id: 'beauty-health', label: 'Beauty & Health', icon: HeartHandshake, slug: 'specialty-coffee-grains' },
    { id: 'hair-wigs', label: 'Hair Extensions & Wigs', icon: Scissors, slug: null },
    { id: 'pet-supplies', label: 'Pet Supplies', icon: PawPrint, slug: null },
    { id: 'jewelry-accessories', label: 'Jewelry & Accessories', icon: Gem, slug: null },
    { id: 'cell-phones', label: 'Cell Phones & Accessories', icon: Smartphone, slug: 'mobile-devices' },
  ];

  const handleItemClick = (cat) => {
    if (onSelectCategory) {
      onSelectCategory(cat.label, cat.slug);
    }
  };

  const handleAllClick = () => {
    if (onSelectCategory) {
      onSelectCategory('All Categories', null);
    }
  };

  return (
    <div className="ali-category-sidebar">
      {/* Top All Categories Pill Header */}
      <button 
        className={`sidebar-all-pill ${activeCategory === 'All Categories' ? 'active' : ''}`}
        onClick={handleAllClick}
      >
        <Menu size={20} className="sidebar-all-icon" />
        <span>All Categories</span>
      </button>

      {/* Vertical Category List */}
      <div className="sidebar-list-container">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          const isActive = activeCategory === cat.label;
          return (
            <button
              key={cat.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => handleItemClick(cat)}
            >
              <div className="sidebar-item-icon">
                <IconComponent size={18} strokeWidth={isActive ? 2.2 : 1.75} />
              </div>
              <span className="sidebar-item-text">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
