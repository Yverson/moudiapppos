import { useEffect, useState } from 'react';

export const ACTIVE_RESTAURANT_CHANGED_EVENT = 'active-restaurant-changed';
export const DEFAULT_RESTAURANT_ID = 'demo-restaurant';

export interface ActiveRestaurant {
  id: string;
  name: string | null;
}

export function getActiveRestaurantId(): string {
  return (
    localStorage.getItem('restaurantId') ||
    import.meta.env.VITE_RESTAURANT_ID ||
    DEFAULT_RESTAURANT_ID
  );
}

export function getActiveRestaurantName(): string | null {
  return (
    localStorage.getItem('restaurantName') ||
    import.meta.env.VITE_RESTAURANT_NAME ||
    null
  );
}

export function getActiveRestaurant(): ActiveRestaurant {
  return {
    id: getActiveRestaurantId(),
    name: getActiveRestaurantName(),
  };
}

export function setActiveRestaurant(restaurant: ActiveRestaurant) {
  localStorage.setItem('restaurantId', restaurant.id);

  if (restaurant.name) {
    localStorage.setItem('restaurantName', restaurant.name);
  } else {
    localStorage.removeItem('restaurantName');
  }

  window.dispatchEvent(
    new CustomEvent<ActiveRestaurant>(ACTIVE_RESTAURANT_CHANGED_EVENT, {
      detail: restaurant,
    }),
  );
}

export function useActiveRestaurant() {
  const [activeRestaurant, setActiveRestaurantState] = useState<ActiveRestaurant>(() =>
    getActiveRestaurant(),
  );

  useEffect(() => {
    const handleChange = (event: Event) => {
      const customEvent = event as CustomEvent<ActiveRestaurant>;
      setActiveRestaurantState(customEvent.detail || getActiveRestaurant());
    };

    window.addEventListener(ACTIVE_RESTAURANT_CHANGED_EVENT, handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      window.removeEventListener(ACTIVE_RESTAURANT_CHANGED_EVENT, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  return activeRestaurant;
}
