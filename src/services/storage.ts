import { Customer } from '../types';

const STORAGE_KEY = 'gadgetzu_loyalty_data';

export const storage = {
  getCustomers: (): Customer[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveCustomers: (customers: Customer[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  },

  addCustomer: (customer: Omit<Customer, 'purchases' | 'redemptions' | 'createdAt' | 'id'>): Customer => {
    const customers = storage.getCustomers();
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      purchases: [],
      redemptions: [],
      createdAt: new Date().toISOString(),
    };
    storage.saveCustomers([...customers, newCustomer]);
    return newCustomer;
  },

  updateCustomer: (id: string, updates: Partial<Customer>): void => {
    const customers = storage.getCustomers();
    const updated = customers.map(c => c.id === id ? { ...c, ...updates } : c);
    storage.saveCustomers(updated);
  },

  deleteCustomer: (id: string): void => {
    const customers = storage.getCustomers();
    storage.saveCustomers(customers.filter(c => c.id !== id));
  },

  addPurchase: (customerId: string, amount: number): void => {
    const customers = storage.getCustomers();
    const points = Math.floor(amount / 70);
    const updated = customers.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          purchases: [
            ...c.purchases,
            { id: crypto.randomUUID(), amount, points, date: new Date().toISOString() }
          ]
        };
      }
      return c;
    });
    storage.saveCustomers(updated);
  },

  addRedemption: (customerId: string, points: number): void => {
    const customers = storage.getCustomers();
    const updated = customers.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          redemptions: [
            ...c.redemptions,
            { id: crypto.randomUUID(), points, date: new Date().toISOString() }
          ]
        };
      }
      return c;
    });
    storage.saveCustomers(updated);
  },

  deletePurchase: (customerId: string, purchaseId: string): void => {
    const customers = storage.getCustomers();
    const updated = customers.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          purchases: c.purchases.filter(p => p.id !== purchaseId)
        };
      }
      return c;
    });
    storage.saveCustomers(updated);
  },

  deleteRedemption: (customerId: string, redemptionId: string): void => {
    const customers = storage.getCustomers();
    const updated = customers.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          redemptions: c.redemptions.filter(r => r.id !== redemptionId)
        };
      }
      return c;
    });
    storage.saveCustomers(updated);
  }
};
