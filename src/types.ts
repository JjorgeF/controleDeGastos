export type TransactionType = 'income' | 'expense' | 'debt_payment' | 'loan_received' | 'benefit_income' | 'benefit_expense';

export type AuthorColor = 'blue' | 'pink' | 'emerald' | 'purple' | 'amber';

export type CardColor = 'purple' | 'orange' | 'black' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';

export interface CreditCard {
  id: string;
  name: string; // e.g. "Nubank Ultravioleta", "Itaú Mastercard", "Inter Black"
  holder?: string; // e.g. "Jorge", "GO"
  lastDigits?: string; // e.g. "4589"
  color: CardColor | string;
  limit?: number; // Total credit limit
  closingDay?: number; // Day of month when invoice closes (1-31)
  dueDay?: number; // Day of month when invoice is due (1-31)
  isDefault?: boolean;
  createdByUid?: string;
  createdByName?: string;
  createdByColor?: AuthorColor | string;
}

export interface HouseholdMember {
  uid: string;
  name: string;
  email?: string;
  photoURL?: string;
  color: AuthorColor | string;
  role?: 'owner' | 'member';
}

export interface Household {
  id: string;
  name: string;
  ownerUid: string;
  members: string[];
  memberEmails: string[];
  memberProfiles?: Record<string, HouseholdMember>;
  inviteCode: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  householdId: string;
  preferredColor?: AuthorColor | string;
  partnerName?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO format
  category: string;
  type: TransactionType;
  debtId?: string;
  loanId?: string;
  cardId?: string; // ID of the credit card used
  cardName?: string; // Name of credit card for display
  paymentMethod?: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'benefit' | 'transfer';
  isInstallment?: boolean;
  installmentCurrent?: number; // e.g. 1
  installmentTotal?: number; // e.g. 3
  installmentGroupId?: string; // Grouping ID for installment series
  person?: string; // e.g. 'Jorge', 'GO', etc. for couples / multi-member VR & expenses
  location?: string; // establishment or place where it was spent (e.g. 'Mercado X', 'Restaurante Y')
  createdByUid?: string;
  createdByName?: string;
  createdByColor?: AuthorColor | string;
  createdByEmail?: string;
}

export interface Debt {
  id: string;
  description: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyAmount: number;
  startDate: string;
  category: string;
  cardId?: string; // Linked credit card ID
  cardName?: string; // Linked credit card Name
  isCompleted: boolean;
  createdByUid?: string;
  createdByName?: string;
  createdByColor?: AuthorColor | string;
  createdByEmail?: string;
}

export interface Loan {
  id: string;
  description: string;
  totalAmount: number;
  remainingAmount: number;
  expectedMonthlyAmount: number;
  startDate: string;
  isCompleted: boolean;
  borrowerName: string;
  createdByUid?: string;
  createdByName?: string;
  createdByColor?: AuthorColor | string;
  createdByEmail?: string;
}

export interface FinanceData {
  transactions: Transaction[];
  debts: Debt[];
  loans: Loan[];
  creditCards?: CreditCard[];
  categories?: string[];
  debtCategories?: string[];
  benefitMembers?: string[];
  version: string;
}

