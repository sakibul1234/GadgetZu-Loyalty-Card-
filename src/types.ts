export interface Purchase {
  id: string;
  amount: number;
  points: number;
  date: string;
}

export interface Redemption {
  id: string;
  points: number;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  cardNumber: string;
  purchases: Purchase[];
  redemptions: Redemption[];
  memo?: string;
  createdAt: string;
}

export type Ranking = 'Platinum' | 'Green' | 'Gold' | 'Silver';
