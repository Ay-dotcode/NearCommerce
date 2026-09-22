export type Store = {
  id: string;
  name: string;
  isOpen: boolean;
  rating: number;
  distance: number;
};

export type StoreProps = {
  id: string;
  name: string;
  isOpen: boolean;
  rating: number;
  distance?: number;
};
