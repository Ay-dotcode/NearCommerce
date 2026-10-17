export type Store = {
  id: string;
  name: string;
  isOpen: boolean;
  rating: number;
  distanceMeters: number;
};

export type StoreProps = {
  id: string;
  name: string;
  isOpen: boolean;
  rating: number;
  distanceMeters?: number;
};
