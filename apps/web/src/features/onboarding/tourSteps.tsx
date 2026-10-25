import type { ReactNode } from "react";
import {
  DoneScene,
  FindScene,
  FreshScene,
  ProductsScene,
  StoreScene,
  VisibilityScene,
  WelcomeScene,
} from "./TourScenes";

export interface TourStep {
  id: string;
  title: string;
  // One or two sentences in plain language, written for someone who has never seen the app.
  body: string;
  // Short, concrete things to do or know.
  tips: string[];
  scene: ReactNode;
}

// What a new store owner needs to know, in the order they will meet it.
export const OWNER_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Near Commerce",
    body: "Shoppers around you search our mobile app for things they need and see which nearby stores have them in stock. This portal is where you tell them what you sell.",
    tips: [
      "Shoppers see how far you are and can get directions",
      "Setting up takes about five minutes",
      "No technical knowledge needed",
    ],
    scene: <WelcomeScene />,
  },
  {
    id: "store",
    title: "Start with your store",
    body: "Add your store's name, street address and opening hours. The address and map position decide when shoppers nearby find you.",
    tips: [
      "Press “Use my location” while you're at the shop to fill in the map position for you",
      "Pick your timezone so your opening hours are right",
      "You can change all of this later in Store settings",
    ],
    scene: <StoreScene />,
  },
  {
    id: "products",
    title: "Add your products",
    body: "Each product has a name, price, how many you have, a photo and a category. Add them one at a time, or import a whole spreadsheet in one go.",
    tips: [
      "Press “Add product” on the Inventory page",
      "Have many items? Use “Import CSV” and start from the sample file",
      "A clear photo helps shoppers recognise what you sell",
    ],
    scene: <ProductsScene />,
  },
  {
    id: "visibility",
    title: "You decide what shoppers see",
    body: "A product is a Draft until you publish it, and only published products can be found by shoppers. A product needs a photo before it can be published.",
    tips: [
      "Keep unfinished products as drafts while you work",
      "Set the quantity to 0 when you sell out: it is flagged “Out of stock”",
      "Unpublish any time to hide a product again",
    ],
    scene: <VisibilityScene />,
  },
  {
    id: "fresh",
    title: "Keep stock information fresh",
    body: "Shoppers trust what they can rely on. Every product remembers when you last checked it, and after 30 days it is marked “Needs verification”.",
    tips: [
      "Press “Confirm still in stock” to refresh a product in one tap",
      "Changing the price or the quantity refreshes it automatically",
      "Use the “Needs verification” filter to see what to check",
    ],
    scene: <FreshScene />,
  },
  {
    id: "find",
    title: "Find things quickly",
    body: "Once your inventory grows, use search and the filters above the list to get to any product in seconds.",
    tips: [
      "The category chips narrow the list to one kind of product",
      "The tiles count published, draft, out-of-stock and stale products",
      "Switch between list and grid view, whichever you prefer",
    ],
    scene: <FindScene />,
  },
  {
    id: "done",
    title: "You're ready to go",
    body: "That's everything. Add your first products and shoppers nearby will start finding your store.",
    tips: [
      "Reopen this tour any time with “Take the tour” at the top",
      "Stuck? “Support” at the top reaches us directly",
    ],
    scene: <DoneScene />,
  },
];
