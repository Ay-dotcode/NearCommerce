// The built-in category tree. It is created automatically the first time the server starts
// with an empty catalog, and an admin can re-run it to add anything that has been deleted.
// Existing categories are matched by name (case-insensitive) and never changed.
export const DEFAULT_CATALOG: ReadonlyArray<{
  name: string;
  subcategories: readonly string[];
}> = [
  {
    name: "Fruits & Vegetables",
    subcategories: [
      "Fresh Fruit",
      "Fresh Vegetables",
      "Herbs & Salad",
      "Organic",
    ],
  },
  {
    name: "Bakery",
    subcategories: ["Bread", "Pastries", "Cakes", "Pitta & Wraps"],
  },
  {
    name: "Dairy & Eggs",
    subcategories: ["Milk", "Cheese", "Yoghurt", "Eggs", "Butter & Cream"],
  },
  {
    name: "Meat & Seafood",
    subcategories: ["Chicken & Poultry", "Beef & Lamb", "Fish", "Deli Meats"],
  },
  {
    name: "Pantry",
    subcategories: [
      "Rice & Pasta",
      "Canned Food",
      "Oils & Sauces",
      "Spices",
      "Breakfast & Cereal",
      "Baking",
    ],
  },
  {
    name: "Snacks & Sweets",
    subcategories: ["Chocolate", "Biscuits", "Crisps & Nuts", "Sweets"],
  },
  {
    name: "Drinks",
    subcategories: ["Water", "Juice", "Soft Drinks", "Tea & Coffee"],
  },
  {
    name: "Frozen",
    subcategories: ["Frozen Meals", "Ice Cream", "Frozen Vegetables"],
  },
  {
    name: "Household",
    subcategories: ["Cleaning", "Laundry", "Kitchen & Dining", "Paper Goods"],
  },
  {
    name: "Personal Care",
    subcategories: ["Hair", "Skin", "Oral Care", "Hygiene"],
  },
  {
    name: "Health & Pharmacy",
    subcategories: ["Vitamins", "First Aid", "Cold & Flu"],
  },
  { name: "Baby & Kids", subcategories: ["Nappies", "Baby Food", "Toys"] },
  { name: "Pets", subcategories: ["Dog", "Cat", "Other Pets"] },
  {
    name: "Electronics",
    subcategories: ["Phones & Accessories", "Computers", "Home Appliances"],
  },
  { name: "Clothing", subcategories: ["Men", "Women", "Kids", "Shoes"] },
];
