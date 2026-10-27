import React from "react";
import {
  Layers,
  Activity,
  BatteryCharging,
  Radio,
  Sun,
  Cpu,
  Grid,
  Zap,
  Plug,
  Shield,
} from "lucide-react";

export interface CategoryItem {
  name: string;
  icon: string;
}

export interface CategoryCardsSectionProps {
  categories: CategoryItem[];
  categoryCounts: Record<string, number>;
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
}

/**
 * Accessible Lucide icon component for each electronic component category card.
 * Shared across Library, Compare, and PCB Design Assistant pages.
 */
export const CategoryIcon: React.FC<{ categoryName: string }> = ({
  categoryName,
}) => {
  switch (categoryName) {
    case "All Components":
      return <Layers size={18} aria-hidden="true" />;
    case "Resistors":
      return <Activity size={18} aria-hidden="true" />;
    case "Capacitors":
      return <BatteryCharging size={18} aria-hidden="true" />;
    case "Inductors":
      return <Radio size={18} aria-hidden="true" />;
    case "Diodes and LEDs":
      return <Sun size={18} aria-hidden="true" />;
    case "BJTs and MOSFETs":
      return <Cpu size={18} aria-hidden="true" />;
    case "Integrated circuits (ICs)":
      return <Grid size={18} aria-hidden="true" />;
    case "Voltage regulators":
      return <Zap size={18} aria-hidden="true" />;
    case "Connectors":
      return <Plug size={18} aria-hidden="true" />;
    case "Switches and protection components":
      return <Shield size={18} aria-hidden="true" />;
    default:
      return <Layers size={18} aria-hidden="true" />;
  }
};

/**
 * Reusable Category Cards Section modeled directly on the Library page design.
 * Shared across the Library, Compare, and PCB Design Assistant pages.
 */
export const CategoryCardsSection: React.FC<CategoryCardsSectionProps> = ({
  categories,
  categoryCounts,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="library-sidebar-categories">
      <div className="library-sidebar-heading">Categories</div>
      <div
        className="library-sidebar-cat-list"
        role="tablist"
        aria-label="Component categories"
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.name;
          const count = categoryCounts[category.name] ?? 0;
          return (
            <button
              key={category.name}
              type="button"
              className={`library-sidebar-cat-card ${
                isSelected ? "active" : ""
              }`}
              onClick={() => onSelectCategory(category.name)}
              title={`Filter by ${category.name} (${count} parts)`}
              aria-pressed={isSelected}
            >
              <div className="library-sidebar-cat-icon">
                <CategoryIcon categoryName={category.name} />
              </div>
              <div className="library-sidebar-cat-info">
                <span className="library-sidebar-cat-name">
                  {category.name}
                </span>
                <span className="library-sidebar-cat-count mono-num">
                  {count} {count === 1 ? "part" : "parts"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

