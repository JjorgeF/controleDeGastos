/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  X,
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  History,
  HandCoins,
  Users,
  Pencil,
  Store,
  UtensilsCrossed,
  Filter,
  Heart,
  Sparkles,
  UserCheck,
  Settings,
  Sliders,
  LogOut,
  LogIn
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, isSameMonth, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

import { Transaction, TransactionType, FinanceData, Debt, Loan, Household, HouseholdMember, UserProfile, AuthorColor, CreditCard as CreditCardType } from './types';
import { 
  auth, 
  onAuthStateChanged, 
  FirebaseUser, 
  db, 
  collection, 
  onSnapshot, 
  doc,
  firebaseSignOut
} from './lib/firebase';
import { 
  saveTransaction, 
  deleteTransactionFromDb, 
  saveDebt, 
  deleteDebtFromDb, 
  saveLoan, 
  deleteLoanFromDb, 
  saveUserSettings, 
  migrateLocalDataToFirestore,
  getOrCreateUserProfile,
  saveCreditCard,
  deleteCreditCardFromDb,
  updateAuthorNameInAllTransactions
} from './lib/firestoreService';
import { UserAuthButton, AuthModal } from './components/AuthModal';
import { CashSummaryCard } from './components/CashSummaryCard';
import { BenefitSummaryCard } from './components/BenefitSummaryCard';
import { ManageCardsModal } from './components/ManageCardsModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { CreditCardsSummaryCard } from './components/CreditCardsSummaryCard';
import { CoupleSyncModal, COLOR_CONFIG, SettingsTab } from './components/CoupleSyncModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { inferPersonFromDescription } from './lib/utils';

const STORAGE_KEY = 'financas_pro_data_v2';

export const getAuthorBadgeStyle = (color?: string) => {
  switch (color) {
    case 'pink':
      return 'bg-pink-500/15 text-pink-300 border-pink-500/30';
    case 'purple':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    case 'emerald':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'amber':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'cyan':
      return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    case 'rose':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    case 'blue':
    default:
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  }
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCoupleModalOpen, setIsCoupleModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [isSyncing, setIsSyncing] = useState(false);
  const [data, setData] = useState<FinanceData>({ 
    transactions: [], 
    debts: [], 
    loans: [], 
    categories: ['Geral', 'Alimentação', 'Supermercado', 'Restaurantes', 'Delivery / iFood', 'Lazer', 'Transporte', 'Saúde', 'Educação'],
    debtCategories: ['Geral', 'Casa', 'Veículo', 'Pessoal'],
    benefitMembers: ['Jorge', 'GO'],
    version: '2.3' 
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [isPayDebtDialogOpen, setIsPayDebtDialogOpen] = useState(false);
  const [isReceiveLoanDialogOpen, setIsReceiveLoanDialogOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageDebtCategoriesOpen, setIsManageDebtCategoriesOpen] = useState(false);
  const [isManageCardsModalOpen, setIsManageCardsModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [viewMode, setViewMode] = useState<'monthly' | 'total'>('monthly');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions'>('transactions');
  const [walletFilter, setWalletFilter] = useState<string>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [statsWalletType, setStatsWalletType] = useState<'cash' | 'benefit'>('cash');
  
  // Transaction Form State
  const [newDescription, setNewDescription] = useState('');
  const [transactionErrors, setTransactionErrors] = useState<Record<string, boolean>>({});
  const [newAmount, setNewAmount] = useState(''); // Raw value for logic
  const [displayNewAmount, setDisplayNewAmount] = useState(''); // Formatted for UI
  const [newType, setNewType] = useState<TransactionType>('expense');
  const [newPocket, setNewPocket] = useState<'cash' | 'benefit'>('cash');
  const [newCategory, setNewCategory] = useState('Geral');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [newPerson, setNewPerson] = useState('Jorge');
  const [isAddingNewPerson, setIsAddingNewPerson] = useState(false);
  const [customPerson, setCustomPerson] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<'credit_card' | 'debit_card' | 'pix' | 'cash' | 'benefit' | 'transfer'>('pix');
  const [newCardId, setNewCardId] = useState('');
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Author on transaction form
  const [newAuthorName, setNewAuthorName] = useState('Jorge');
  const [newAuthorColor, setNewAuthorColor] = useState<AuthorColor>('blue');

  // Debt Form State
  const [debtDescription, setDebtDescription] = useState('');
  const [debtTotal, setDebtTotal] = useState('');
  const [displayDebtTotal, setDisplayDebtTotal] = useState('');
  const [debtInstallments, setDebtInstallments] = useState('1');
  const [debtCategory, setDebtCategory] = useState('Geral');
  const [debtCardId, setDebtCardId] = useState('');
  const [debtErrors, setDebtErrors] = useState<Record<string, boolean>>({});
  const [isAddingNewDebtCategory, setIsAddingNewDebtCategory] = useState(false);
  const [customDebtCategory, setCustomDebtCategory] = useState('');
  const [debtStartDate, setDebtStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Loan Form State
  const [loanDescription, setLoanDescription] = useState('');
  const [loanTotal, setLoanTotal] = useState('');
  const [displayLoanTotal, setDisplayLoanTotal] = useState('');
  const [loanBorrower, setLoanBorrower] = useState('');
  const [loanInstallments, setLoanInstallments] = useState('1');
  const [loanStartDate, setLoanStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loanErrors, setLoanErrors] = useState<Record<string, boolean>>({});

  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);

  // Pay/Receive Form State
  const [payAmount, setPayAmount] = useState('');
  const [displayPayAmount, setDisplayPayAmount] = useState('');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receiveAmount, setReceiveAmount] = useState('');
  const [displayReceiveAmount, setDisplayReceiveAmount] = useState('');
  const [receiveDate, setReceiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal confirmation for deleting items safely
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    itemName?: string;
    itemDetail?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    onConfirm: () => {}
  });

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Initialize or fetch User Profile and Household when user signs in
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setHousehold(null);
      return;
    }

    let isMounted = true;
    getOrCreateUserProfile(user).then(({ profile, household: h }) => {
      if (isMounted) {
        setUserProfile(profile);
        setHousehold(h);
        if (profile.displayName) {
          setNewAuthorName(profile.displayName);
        }
        if (profile.preferredColor) {
          setNewAuthorColor(profile.preferredColor as AuthorColor);
        }
      }
    }).catch(err => {
      console.error("Error loading user profile / household:", err);
    });

    // Listen to user document for any household changes (e.g., joined a household)
    const unsubUserProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists() && isMounted) {
        const p = docSnap.data() as UserProfile;
        setUserProfile(p);
      }
    }, (err) => {
      console.warn("User profile snapshot listener notice:", err?.message || err);
    });

    return () => {
      isMounted = false;
      unsubUserProfile();
    };
  }, [user]);

  // Firestore Realtime Synchronization based on Household
  useEffect(() => {
    if (!user) {
      // Offline / Local storage fallback when not logged in
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!parsed.categories) parsed.categories = ['Geral', 'Alimentação', 'Lazer', 'Transporte', 'Saúde', 'Educação'];
          if (!parsed.debtCategories) parsed.debtCategories = ['Geral', 'Casa', 'Veículo', 'Pessoal'];
          setData(parsed);
        } catch (e) {
          console.error('Error loading data', e);
        }
      }
      return;
    }

    // Determine target ID (household ID or user UID fallback)
    const targetId = userProfile?.householdId || household?.id || user.uid;

    setIsSyncing(true);

    // Listen to Household document for real-time member updates
    const unsubHousehold = onSnapshot(doc(db, 'households', targetId), (docSnap) => {
      if (docSnap.exists()) {
        const hData = docSnap.data() as Household;
        setHousehold(hData);
      }
    }, (err) => {
      console.warn("Household snapshot listener notice:", err?.message || err);
    });

    // Listen to settings
    const unsubSettings = onSnapshot(doc(db, 'households', targetId, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const s = docSnap.data();
        setData(prev => ({
          ...prev,
          categories: s.categories || prev.categories,
          debtCategories: s.debtCategories || prev.debtCategories,
          benefitMembers: s.benefitMembers || prev.benefitMembers || ['Jorge', 'GO']
        }));
      } else {
        // Init default settings in Firestore for new households
        saveUserSettings(
          targetId, 
          data.categories || ['Geral', 'Alimentação', 'Supermercado', 'Restaurantes', 'Delivery / iFood', 'Lazer', 'Transporte', 'Saúde', 'Educação'],
          data.debtCategories || ['Geral', 'Casa', 'Veículo', 'Pessoal'],
          data.benefitMembers || ['Jorge', 'GO']
        ).catch((err) => console.warn("Notice saving initial settings:", err?.message || err));
      }
    }, (err) => {
      console.warn("Settings snapshot listener notice:", err?.message || err);
    });

    // Listen to transactions
    const unsubTransactions = onSnapshot(collection(db, 'households', targetId, 'transactions'), (snapshot) => {
      const transactionsList: Transaction[] = [];
      snapshot.forEach((doc) => {
        transactionsList.push(doc.data() as Transaction);
      });
      // Sort desc by date
      transactionsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setData(prev => ({ ...prev, transactions: transactionsList }));
      setIsSyncing(false);
    }, (error) => {
      console.warn("Firestore transactions notice:", error?.message || error);
      setIsSyncing(false);
    });

    // Listen to debts
    const unsubDebts = onSnapshot(collection(db, 'households', targetId, 'debts'), (snapshot) => {
      const debtsList: Debt[] = [];
      snapshot.forEach((doc) => {
        debtsList.push(doc.data() as Debt);
      });
      setData(prev => ({ ...prev, debts: debtsList }));
    }, (err) => {
      console.warn("Debts snapshot notice:", err?.message || err);
    });

    // Listen to loans
    const unsubLoans = onSnapshot(collection(db, 'households', targetId, 'loans'), (snapshot) => {
      const loansList: Loan[] = [];
      snapshot.forEach((doc) => {
        loansList.push(doc.data() as Loan);
      });
      setData(prev => ({ ...prev, loans: loansList }));
    }, (err) => {
      console.warn("Loans snapshot notice:", err?.message || err);
    });

    // Listen to credit cards
    const unsubCards = onSnapshot(collection(db, 'households', targetId, 'creditCards'), (snapshot) => {
      const cardsList: CreditCardType[] = [];
      snapshot.forEach((doc) => {
        cardsList.push(doc.data() as CreditCardType);
      });
      setData(prev => ({ ...prev, creditCards: cardsList }));
    }, (err) => {
      console.warn("Credit cards snapshot notice:", err?.message || err);
    });

    return () => {
      unsubHousehold();
      unsubSettings();
      unsubTransactions();
      unsubDebts();
      unsubLoans();
      unsubCards();
    };
  }, [user, userProfile?.householdId, household?.id]);

  // Save local data backup / cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const filteredTransactions = useMemo(() => {
    let list = data.transactions;
    
    if (viewMode === 'monthly') {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      list = list.filter(t => {
        const date = parseISO(t.date);
        return isWithinInterval(date, { start, end });
      });
    }

    if (walletFilter === 'cash') {
      list = list.filter(t => !t.type.startsWith('benefit_'));
    } else if (walletFilter === 'benefit_all') {
      list = list.filter(t => t.type.startsWith('benefit_'));
    } else if (walletFilter.startsWith('benefit_member:')) {
      const member = walletFilter.replace('benefit_member:', '').toLowerCase();
      list = list.filter(t => {
        if (!t.type.startsWith('benefit_')) return false;
        const p = t.person || inferPersonFromDescription(t.description);
        return p?.toLowerCase() === member;
      });
    }

    if (authorFilter !== 'all') {
      list = list.filter(t => {
        const name = t.createdByName || 'Jorge';
        return name.toLowerCase() === authorFilter.toLowerCase();
      });
    }

    return list;
  }, [data.transactions, currentMonth, viewMode, walletFilter, authorFilter]);

  const availableAuthors = useMemo(() => {
    const authorMap = new Map<string, { name: string; color: AuthorColor; isPartner?: boolean }>();
    
    // From household memberProfiles
    if (household?.memberProfiles) {
      Object.entries(household.memberProfiles).forEach(([uid, member]) => {
        const m = member as HouseholdMember;
        const isPartner = uid !== user?.uid;
        if (m && m.name) {
          authorMap.set(m.name.toLowerCase(), { 
            name: m.name, 
            color: (m.color as AuthorColor) || (isPartner ? 'pink' : 'blue'),
            isPartner
          });
        }
      });
    }

    // Default current user if not in profiles yet
    const myName = userProfile?.displayName || user?.displayName || 'Jorge';
    const myColor = (userProfile?.preferredColor as AuthorColor) || 'blue';
    if (!authorMap.has(myName.toLowerCase())) {
      authorMap.set(myName.toLowerCase(), { name: myName, color: myColor, isPartner: false });
    }
    
    // From transaction records
    data.transactions.forEach(t => {
      if (t.createdByName) {
        const key = t.createdByName.toLowerCase();
        if (!authorMap.has(key)) {
          authorMap.set(key, { 
            name: t.createdByName, 
            color: (t.createdByColor as AuthorColor) || 'blue' 
          });
        }
      }
    });

    return Array.from(authorMap.values());
  }, [household, userProfile, user, data.transactions]);

  const coupleMonthlyBreakdown = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const monthTransactions = data.transactions.filter(t => {
      try {
        const date = parseISO(t.date);
        return isWithinInterval(date, { start, end });
      } catch {
        return false;
      }
    });

    const summaryMap: Record<string, { name: string; color: AuthorColor; totalExpense: number; totalIncome: number; count: number }> = {};

    availableAuthors.forEach(a => {
      summaryMap[a.name.toLowerCase()] = {
        name: a.name,
        color: a.color,
        totalExpense: 0,
        totalIncome: 0,
        count: 0
      };
    });

    monthTransactions.forEach(t => {
      const authorName = t.createdByName || 'Jorge';
      const key = authorName.toLowerCase();
      const color = (t.createdByColor as AuthorColor) || 'blue';
      
      if (!summaryMap[key]) {
        summaryMap[key] = {
          name: authorName,
          color,
          totalExpense: 0,
          totalIncome: 0,
          count: 0
        };
      }

      summaryMap[key].count++;
      if (t.type === 'income' || t.type === 'loan_received' || t.type === 'benefit_income') {
        summaryMap[key].totalIncome += t.amount;
      } else {
        summaryMap[key].totalExpense += t.amount;
      }
    });

    return Object.values(summaryMap).filter(s => s.count > 0 || (household?.members?.length || 0) > 1);
  }, [data.transactions, currentMonth, availableAuthors, household]);

  const pendingDebtsForMonth = useMemo(() => {
    if (viewMode !== 'monthly') return [];
    
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    return data.debts.filter(debt => {
      if (debt.isCompleted) return false;
      const startDate = parseISO(debt.startDate);
      // Debt shows up if started on or before this month
      if (isAfter(startDate, end)) return false;
      
      // Check if already paid this month
      const alreadyPaidThisMonth = data.transactions.some(t => 
        t.debtId === debt.id && 
        isWithinInterval(parseISO(t.date), { start, end })
      );
      
      return !alreadyPaidThisMonth;
    });
  }, [data.debts, data.transactions, currentMonth, viewMode]);

  const suggestedRecurring = useMemo(() => {
    // 1. Get transactions from the last 3 months (excluding current)
    const threeMonthsAgo = subMonths(currentMonth, 3);
    const startOfCurrent = startOfMonth(currentMonth);
    
    const pastTransactions = data.transactions.filter(t => {
      const tDate = parseISO(t.date);
      return isAfter(tDate, threeMonthsAgo) && isBefore(tDate, startOfCurrent);
    });

    // 2. Count occurrences of patterns (description + amount + type)
    const patterns: Record<string, { count: number; template: Transaction }> = {};
    pastTransactions.forEach(t => {
      const key = `${t.description.toLowerCase()}-${t.type}-${t.amount}`;
      if (!patterns[key]) {
        patterns[key] = { count: 0, template: t };
      }
      patterns[key].count++;
    });

    // 3. Filter patterns that appear at least 2 times in 3 months
    const frequent = Object.values(patterns)
      .filter(p => p.count >= 2)
      .map(p => p.template);

    // 4. Filter out those already launched in the current month
    const currentMonthTransactions = data.transactions.filter(t => 
      isWithinInterval(parseISO(t.date), { 
        start: startOfMonth(currentMonth), 
        end: endOfMonth(currentMonth) 
      })
    );

    return frequent.filter(template => {
      const alreadyExists = currentMonthTransactions.some(t => 
        t.description.toLowerCase() === template.description.toLowerCase() &&
        t.amount === template.amount &&
        t.type === template.type
      );
      return !alreadyExists;
    });
  }, [data.transactions, currentMonth]);

  const stats = useMemo(() => {
    // Current period transactions based on viewMode & currentMonth
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const periodTransactions = viewMode === 'monthly'
      ? data.transactions.filter(t => {
          const date = parseISO(t.date);
          return isWithinInterval(date, { start, end });
        })
      : data.transactions;

    const mainIncome = periodTransactions
      .filter(t => t.type === 'income' || t.type === 'loan_received')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const mainExpense = periodTransactions
      .filter(t => t.type === 'expense' || t.type === 'debt_payment')
      .reduce((acc, t) => acc + t.amount, 0);

    const benefitIncome = periodTransactions
      .filter(t => t.type === 'benefit_income')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const benefitExpense = periodTransactions
      .filter(t => t.type === 'benefit_expense')
      .reduce((acc, t) => acc + t.amount, 0);

    // Individual breakdown by member for benefits
    const benefitIncomeByMember: Record<string, number> = {};
    const benefitExpenseByMember: Record<string, number> = {};
    const currentMembers = data.benefitMembers || ['Jorge', 'GO'];

    currentMembers.forEach(m => {
      benefitIncomeByMember[m] = 0;
      benefitExpenseByMember[m] = 0;
    });

    periodTransactions.forEach(t => {
      if (t.type === 'benefit_income') {
        const rawPerson = t.person || inferPersonFromDescription(t.description, currentMembers);
        const match = currentMembers.find(m => m.toLowerCase() === rawPerson?.toLowerCase()) || currentMembers[0] || 'Jorge';
        benefitIncomeByMember[match] = (benefitIncomeByMember[match] || 0) + t.amount;
      } else if (t.type === 'benefit_expense') {
        const rawPerson = t.person || inferPersonFromDescription(t.description, currentMembers);
        const match = currentMembers.find(m => m.toLowerCase() === rawPerson?.toLowerCase()) || currentMembers[0] || 'Jorge';
        benefitExpenseByMember[match] = (benefitExpenseByMember[match] || 0) + t.amount;
      }
    });

    // Calculate previous month for comparison
    const prevMonthStart = startOfMonth(subMonths(currentMonth, 1));
    const prevMonthEnd = endOfMonth(subMonths(currentMonth, 1));

    const prevIncome = data.transactions
      .filter(t => {
        const date = parseISO(t.date);
        return (t.type === 'income' || t.type === 'loan_received') && 
               isWithinInterval(date, { start: prevMonthStart, end: prevMonthEnd });
      })
      .reduce((acc, t) => acc + t.amount, 0);

    const prevExpense = data.transactions
      .filter(t => {
        const date = parseISO(t.date);
        return (t.type === 'expense' || t.type === 'debt_payment') && 
               isWithinInterval(date, { start: prevMonthStart, end: prevMonthEnd });
      })
      .reduce((acc, t) => acc + t.amount, 0);

    const prevBenefitIncome = data.transactions
      .filter(t => {
        const date = parseISO(t.date);
        return t.type === 'benefit_income' && 
               isWithinInterval(date, { start: prevMonthStart, end: prevMonthEnd });
      })
      .reduce((acc, t) => acc + t.amount, 0);

    const prevBenefitExpense = data.transactions
      .filter(t => {
        const date = parseISO(t.date);
        return t.type === 'benefit_expense' && 
               isWithinInterval(date, { start: prevMonthStart, end: prevMonthEnd });
      })
      .reduce((acc, t) => acc + t.amount, 0);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };
    
    // Accumulated Balance up to the end of the current month
    const accumulatedTransactions = data.transactions.filter(t => {
      try {
        const date = parseISO(t.date);
        return date <= end;
      } catch {
        return false;
      }
    });

    const accumulatedMainBalance = accumulatedTransactions
      .filter(t => t.type === 'income' || t.type === 'loan_received')
      .reduce((acc, t) => acc + t.amount, 0)
      - accumulatedTransactions
      .filter(t => t.type === 'expense' || t.type === 'debt_payment')
      .reduce((acc, t) => acc + t.amount, 0);

    const accumulatedBenefitBalance = accumulatedTransactions
      .filter(t => t.type === 'benefit_income')
      .reduce((acc, t) => acc + t.amount, 0)
      - accumulatedTransactions
      .filter(t => t.type === 'benefit_expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const accumulatedBenefitByMember: Record<string, number> = {};
    currentMembers.forEach(m => {
      accumulatedBenefitByMember[m] = 0;
    });

    accumulatedTransactions.forEach(t => {
      if (t.type === 'benefit_income') {
        const rawPerson = t.person || inferPersonFromDescription(t.description, currentMembers);
        const match = currentMembers.find(m => m.toLowerCase() === rawPerson?.toLowerCase()) || currentMembers[0] || 'Jorge';
        accumulatedBenefitByMember[match] = (accumulatedBenefitByMember[match] || 0) + t.amount;
      } else if (t.type === 'benefit_expense') {
        const rawPerson = t.person || inferPersonFromDescription(t.description, currentMembers);
        const match = currentMembers.find(m => m.toLowerCase() === rawPerson?.toLowerCase()) || currentMembers[0] || 'Jorge';
        accumulatedBenefitByMember[match] = (accumulatedBenefitByMember[match] || 0) - t.amount;
      }
    });

    return {
      accumulatedMainBalance,
      accumulatedBenefitBalance,
      accumulatedBenefitByMember,
      mainIncome,
      mainExpense,
      mainBalance: mainIncome - mainExpense,
      mainIncomeChange: calculateChange(mainIncome, prevIncome),
      mainExpenseChange: calculateChange(mainExpense, prevExpense),

      benefitIncome,
      benefitExpense,
      benefitBalance: benefitIncome - benefitExpense,
      benefitIncomeChange: calculateChange(benefitIncome, prevBenefitIncome),
      benefitExpenseChange: calculateChange(benefitExpense, prevBenefitExpense),
      benefitIncomeByMember,
      benefitExpenseByMember,

      income: mainIncome + benefitIncome,
      expense: mainExpense + benefitExpense,
      incomeChange: calculateChange(mainIncome, prevIncome),
      expenseChange: calculateChange(mainExpense, prevExpense)
    };
  }, [data.transactions, data.benefitMembers, currentMonth, viewMode]);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
    
    return months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      
      const monthlyTransactions = data.transactions.filter(t => {
        const date = parseISO(t.date);
        return isWithinInterval(date, { start, end });
      });
      
      const income = monthlyTransactions
        .filter(t => t.type === 'income' || t.type === 'loan_received')
        .reduce((acc, t) => acc + t.amount, 0);
      
      const expense = monthlyTransactions
        .filter(t => t.type === 'expense' || t.type === 'debt_payment')
        .reduce((acc, t) => acc + t.amount, 0);
        
      return {
        name: format(m, 'MMM', { locale: ptBR }),
        income,
        expense,
        balance: income - expense
      };
    });
  }, [data.transactions]);

  const categoryData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense' || t.type === 'debt_payment');
    const categories: Record<string, number> = {};
    
    expenses.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00c49f'];

  const maskCurrency = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return { display: '', raw: '' };
    
    const amount = parseInt(numericValue) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
    
    return { display: formatted, raw: amount.toString() };
  };

  const handleCurrencyChange = (value: string, setDisplay: (v: string) => void, setRaw: (v: string) => void) => {
    const { display, raw } = maskCurrency(value);
    setDisplay(display);
    setRaw(raw);
  };

  const currentHouseholdId = userProfile?.householdId || household?.id || user?.uid || 'default';

  const handleAddTransaction = () => {
    const newErrors: Record<string, boolean> = {};
    if (!newDescription) newErrors.description = true;
    if (!newAmount) newErrors.amount = true;

    const categoryToUse = isAddingNewCategory ? customCategory.trim() : newCategory;
    if (!categoryToUse) newErrors.category = true;

    if (newPocket === 'benefit' && newType === 'benefit_income' && isAddingNewPerson && !customPerson.trim()) {
       newErrors.person = true;
    }

    setTransactionErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const amount = parseFloat(newAmount);
    if (isNaN(amount)) {
      toast.error('Valor inválido');
      newErrors.amount = true;
      setTransactionErrors({...newErrors});
      return;
    }

    // Check for duplicate category if adding new
    if (isAddingNewCategory) {
      const exists = data.categories?.some(c => c.toLowerCase() === categoryToUse.toLowerCase());
      if (exists) {
        toast.error(`A categoria "${categoryToUse}" já existe!`);
        return;
      }
    }

    const pocketType: TransactionType = newPocket === 'benefit' 
      ? (newType === 'income' ? 'benefit_income' : 'benefit_expense')
      : newType;

    const personToUse = newPocket === 'benefit' 
      ? (isAddingNewPerson ? customPerson.trim() : (newPerson || inferPersonFromDescription(newDescription) || 'Jorge'))
      : undefined;

    const locationToUse = newLocation.trim() || undefined;

    const memberToSave = (newPocket === 'benefit' && isAddingNewPerson && customPerson.trim()) ? customPerson.trim() : null;

    const authorNameToUse = newAuthorName.trim() || userProfile?.displayName || user?.displayName || 'Jorge';
    const authorColorToUse = newAuthorColor || (userProfile?.preferredColor as AuthorColor) || 'blue';

    if (editingTransactionId) {
      const existing = data.transactions.find(t => t.id === editingTransactionId);
      const updatedTransaction: Transaction = {
        id: editingTransactionId,
        description: newDescription,
        amount,
        date: newDate,
        category: categoryToUse,
        type: pocketType,
        debtId: existing?.debtId,
        loanId: existing?.loanId,
        person: personToUse,
        location: locationToUse,
        paymentMethod: newPaymentMethod,
        cardId: newPaymentMethod === 'credit_card' ? newCardId : undefined,
        cardName: newPaymentMethod === 'credit_card' ? data.creditCards?.find(c => c.id === newCardId)?.name : undefined,
        createdByUid: existing?.createdByUid || user?.uid,
        createdByName: authorNameToUse,
        createdByColor: authorColorToUse,
        createdByEmail: existing?.createdByEmail || user?.email || undefined
      };

      if (user) {
        saveTransaction(currentHouseholdId, updatedTransaction).catch((e) => toast.error('Erro ao atualizar no Firebase: ' + e.message));
        let updatedCats = data.categories || [];
        let updatedMembers = data.benefitMembers || ['Jorge', 'GO'];
        let shouldSaveSettings = false;

        if (isAddingNewCategory && !updatedCats.includes(categoryToUse)) {
          updatedCats = [...updatedCats, categoryToUse];
          shouldSaveSettings = true;
        }
        if (memberToSave && !updatedMembers.includes(memberToSave)) {
          updatedMembers = [...updatedMembers, memberToSave];
          shouldSaveSettings = true;
        }
        if (shouldSaveSettings) {
          saveUserSettings(currentHouseholdId, updatedCats, data.debtCategories || [], updatedMembers).catch(console.error);
        }
      }

      setData(prev => {
        const newData = {
          ...prev,
          transactions: prev.transactions.map(t => t.id === editingTransactionId ? updatedTransaction : t)
        };
        if (isAddingNewCategory && !prev.categories?.includes(categoryToUse)) {
          newData.categories = [...(prev.categories || []), categoryToUse];
        }
        if (memberToSave && !prev.benefitMembers?.includes(memberToSave)) {
          newData.benefitMembers = [...(prev.benefitMembers || ['Jorge', 'GO']), memberToSave];
        }
        return newData;
      });

      setIsAddDialogOpen(false);
      resetTransactionForm();
      toast.success('Lançamento atualizado com sucesso');
      return;
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      description: newDescription,
      amount,
      date: newDate,
      category: categoryToUse,
      type: pocketType,
      person: personToUse,
      location: locationToUse,
      paymentMethod: newPaymentMethod,
      cardId: newPaymentMethod === 'credit_card' ? newCardId : undefined,
      cardName: newPaymentMethod === 'credit_card' ? data.creditCards?.find(c => c.id === newCardId)?.name : undefined,
      createdByUid: user?.uid,
      createdByName: authorNameToUse,
      createdByColor: authorColorToUse,
      createdByEmail: user?.email || undefined
    };

    if (user) {
      saveTransaction(currentHouseholdId, newTransaction).catch((e) => toast.error('Erro ao salvar no Firebase: ' + e.message));
      let updatedCats = data.categories || [];
      let updatedMembers = data.benefitMembers || ['Jorge', 'GO'];
      let shouldSaveSettings = false;

      if (isAddingNewCategory && !updatedCats.includes(categoryToUse)) {
        updatedCats = [...updatedCats, categoryToUse];
        shouldSaveSettings = true;
      }
      if (memberToSave && !updatedMembers.includes(memberToSave)) {
        updatedMembers = [...updatedMembers, memberToSave];
        shouldSaveSettings = true;
      }
      if (shouldSaveSettings) {
        saveUserSettings(currentHouseholdId, updatedCats, data.debtCategories || [], updatedMembers).catch(console.error);
      }
    }

    setData(prev => {
      const newData = { ...prev, transactions: [newTransaction, ...prev.transactions] };
      if (isAddingNewCategory && !prev.categories?.includes(categoryToUse)) {
        newData.categories = [...(prev.categories || []), categoryToUse];
      }
      if (memberToSave && !prev.benefitMembers?.includes(memberToSave)) {
        newData.benefitMembers = [...(prev.benefitMembers || ['Jorge', 'GO']), memberToSave];
      }
      return newData;
    });

    setIsAddDialogOpen(false);
    resetTransactionForm();
    toast.success('Lançamento adicionado com sucesso');
  };

  const handleAddDebt = () => {
    const newErrors: Record<string, boolean> = {};
    if (!debtDescription) newErrors.description = true;
    if (!debtTotal) newErrors.total = true;
    if (!debtInstallments) newErrors.installments = true;

    const categoryToUse = isAddingNewDebtCategory ? customDebtCategory.trim() : debtCategory;
    if (!categoryToUse) newErrors.category = true;

    setDebtErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error('Preencha todos os campos da dívida');
      return;
    }

    const total = parseFloat(debtTotal);
    const installments = parseInt(debtInstallments);
    
    if (isNaN(total) || isNaN(installments) || installments <= 0) {
      toast.error('Valores inválidos');
      if (isNaN(total)) newErrors.total = true;
      if (isNaN(installments) || installments <= 0) newErrors.installments = true;
      setDebtErrors({...newErrors});
      return;
    }

    // Check for duplicate category
    if (isAddingNewDebtCategory) {
      const exists = data.debtCategories?.some(c => c.toLowerCase() === categoryToUse.toLowerCase());
      if (exists) {
        toast.error(`A categoria "${categoryToUse}" já existe!`);
        return;
      }
    }

    const authorNameToUse = userProfile?.displayName || user?.displayName || 'Jorge';
    const authorColorToUse = (userProfile?.preferredColor as AuthorColor) || 'blue';

    if (editingDebtId) {
      const existing = data.debts.find(d => d.id === editingDebtId);
      const difference = total - (existing?.totalAmount || 0);
      const newRemaining = Math.max(0, (existing?.remainingAmount || 0) + difference);
      const updatedDebt: Debt = {
        id: editingDebtId,
        description: debtDescription,
        totalAmount: total,
        remainingAmount: newRemaining,
        monthlyAmount: total / installments,
        category: categoryToUse,
        startDate: debtStartDate,
        isCompleted: newRemaining <= 0,
        cardId: debtCardId && debtCardId !== 'none' ? debtCardId : undefined,
        cardName: debtCardId && debtCardId !== 'none' ? data.creditCards?.find(c => c.id === debtCardId)?.name : undefined,
        createdByUid: existing?.createdByUid || user?.uid,
        createdByName: existing?.createdByName || authorNameToUse,
        createdByColor: existing?.createdByColor || authorColorToUse
      };

      if (user) {
        saveDebt(currentHouseholdId, updatedDebt).catch(console.error);
        if (isAddingNewDebtCategory && !data.debtCategories?.includes(categoryToUse)) {
          const newDebtCats = [...(data.debtCategories || []), categoryToUse];
          saveUserSettings(currentHouseholdId, data.categories || [], newDebtCats).catch(console.error);
        }
      }

      setData(prev => {
        const newData = {
          ...prev,
          debts: prev.debts.map(d => d.id === editingDebtId ? updatedDebt : d)
        };
        if (isAddingNewDebtCategory && !prev.debtCategories?.includes(categoryToUse)) {
          newData.debtCategories = [...(prev.debtCategories || []), categoryToUse];
        }
        return newData;
      });
      toast.success('Dívida atualizada');
    } else {
      const newDebt: Debt = {
        id: crypto.randomUUID(),
        description: debtDescription,
        totalAmount: total,
        remainingAmount: total,
        monthlyAmount: total / installments,
        startDate: debtStartDate,
        category: categoryToUse,
        isCompleted: false,
        cardId: debtCardId && debtCardId !== 'none' ? debtCardId : undefined,
        cardName: debtCardId && debtCardId !== 'none' ? data.creditCards?.find(c => c.id === debtCardId)?.name : undefined,
        createdByUid: user?.uid,
        createdByName: authorNameToUse,
        createdByColor: authorColorToUse
      };

      if (user) {
        saveDebt(currentHouseholdId, newDebt).catch(console.error);
        if (isAddingNewDebtCategory && !data.debtCategories?.includes(categoryToUse)) {
          const newDebtCats = [...(data.debtCategories || []), categoryToUse];
          saveUserSettings(currentHouseholdId, data.categories || [], newDebtCats).catch(console.error);
        }
      }

      setData(prev => {
        const newData = {
          ...prev,
          debts: [...prev.debts, newDebt]
        };
        if (isAddingNewDebtCategory && !prev.debtCategories?.includes(categoryToUse)) {
          newData.debtCategories = [...(prev.debtCategories || []), categoryToUse];
        }
        return newData;
      });
      toast.success('Dívida registrada com sucesso');
    }

    setIsDebtDialogOpen(false);
    resetDebtForm();
  };

  const handleAddLoan = () => {
    const newErrors: Record<string, boolean> = {};
    if (!loanDescription) newErrors.description = true;
    if (!loanTotal) newErrors.total = true;
    if (!loanBorrower) newErrors.borrower = true;

    setLoanErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error('Preencha todos os campos');
      return;
    }

    const total = parseFloat(loanTotal);
    const installments = parseInt(loanInstallments) || 1;
    
    if (isNaN(total) || total <= 0) {
      toast.error('Valor inválido');
      newErrors.total = true;
      setLoanErrors({...newErrors});
      return;
    }

    const authorNameToUse = userProfile?.displayName || user?.displayName || 'Jorge';
    const authorColorToUse = (userProfile?.preferredColor as AuthorColor) || 'blue';

    if (editingLoanId) {
      const existing = data.loans.find(l => l.id === editingLoanId);
      const difference = total - (existing?.totalAmount || 0);
      const newRemaining = Math.max(0, (existing?.remainingAmount || 0) + difference);
      const updatedLoan: Loan = {
        id: editingLoanId,
        description: loanDescription,
        totalAmount: total,
        remainingAmount: newRemaining,
        expectedMonthlyAmount: total / installments,
        startDate: loanStartDate,
        borrowerName: loanBorrower,
        isCompleted: newRemaining <= 0,
        createdByUid: existing?.createdByUid || user?.uid,
        createdByName: existing?.createdByName || authorNameToUse,
        createdByColor: existing?.createdByColor || authorColorToUse
      };

      if (user) {
        saveLoan(currentHouseholdId, updatedLoan).catch(console.error);
      }

      setData(prev => ({
        ...prev,
        loans: prev.loans.map(l => l.id === editingLoanId ? updatedLoan : l)
      }));
      toast.success('Empréstimo atualizado');
    } else {
      const newLoan: Loan = {
        id: crypto.randomUUID(),
        description: loanDescription,
        totalAmount: total,
        remainingAmount: total,
        expectedMonthlyAmount: total / installments,
        startDate: loanStartDate,
        isCompleted: false,
        borrowerName: loanBorrower,
        createdByUid: user?.uid,
        createdByName: authorNameToUse,
        createdByColor: authorColorToUse
      };

      if (user) {
        saveLoan(currentHouseholdId, newLoan).catch(console.error);
      }

      setData(prev => ({
        ...prev,
        loans: [...prev.loans, newLoan]
      }));
      toast.success('Empréstimo registrado');
    }

    setIsLoanDialogOpen(false);
    resetLoanForm();
  };

  const handleEditDebt = (debt: Debt) => {
    setEditingDebtId(debt.id);
    setDebtDescription(debt.description);
    setDebtTotal(debt.totalAmount.toString());
    const { display } = maskCurrency(Math.round(debt.totalAmount * 100).toString());
    setDisplayDebtTotal(display);
    setDebtCategory(debt.category);
    setDebtStartDate(debt.startDate);
    setDebtCardId(debt.cardId || '');
    setDebtInstallments(Math.round(debt.totalAmount / debt.monthlyAmount).toString());
    setIsDebtDialogOpen(true);
  };

  const handleEditLoan = (loan: Loan) => {
    setEditingLoanId(loan.id);
    setLoanDescription(loan.description);
    setLoanTotal(loan.totalAmount.toString());
    const { display } = maskCurrency(Math.round(loan.totalAmount * 100).toString());
    setDisplayLoanTotal(display);
    setLoanBorrower(loan.borrowerName);
    setLoanInstallments(Math.round(loan.totalAmount / loan.expectedMonthlyAmount).toString());
    setLoanStartDate(loan.startDate);
    setIsLoanDialogOpen(true);
  };

  const handlePayDebt = () => {
    if (!selectedDebt || !payAmount) return;

    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor de pagamento inválido');
      return;
    }

    const authorNameToUse = userProfile?.displayName || user?.displayName || 'Jorge';
    const authorColorToUse = (userProfile?.preferredColor as AuthorColor) || 'blue';

    const paymentTransaction: Transaction = {
      id: crypto.randomUUID(),
      description: `Pagamento: ${selectedDebt.description}`,
      amount,
      date: payDate,
      category: selectedDebt.category,
      type: 'debt_payment',
      debtId: selectedDebt.id,
      createdByUid: user?.uid,
      createdByName: authorNameToUse,
      createdByColor: authorColorToUse,
      createdByEmail: user?.email || undefined
    };

    const newRemaining = Math.max(0, selectedDebt.remainingAmount - amount);
    const updatedDebt: Debt = {
      ...selectedDebt,
      remainingAmount: newRemaining,
      isCompleted: newRemaining <= 0
    };

    if (user) {
      saveTransaction(currentHouseholdId, paymentTransaction).catch(console.error);
      saveDebt(currentHouseholdId, updatedDebt).catch(console.error);
    }

    setData(prev => {
      const updatedDebts = prev.debts.map(d => d.id === selectedDebt.id ? updatedDebt : d);
      return {
        ...prev,
        transactions: [paymentTransaction, ...prev.transactions],
        debts: updatedDebts
      };
    });

    setIsPayDebtDialogOpen(false);
    setPayAmount('');
    setDisplayPayAmount('');
    setPayDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedDebt(null);
    toast.success('Pagamento registrado');
  };

  const handleReceiveLoan = () => {
    if (!selectedLoan || !receiveAmount) return;

    const amount = parseFloat(receiveAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    const authorNameToUse = userProfile?.displayName || user?.displayName || 'Jorge';
    const authorColorToUse = (userProfile?.preferredColor as AuthorColor) || 'blue';

    const receiptTransaction: Transaction = {
      id: crypto.randomUUID(),
      description: `Recebimento: ${selectedLoan.description} (${selectedLoan.borrowerName})`,
      amount,
      date: receiveDate,
      category: 'Empréstimos',
      type: 'loan_received',
      loanId: selectedLoan.id,
      createdByUid: user?.uid,
      createdByName: authorNameToUse,
      createdByColor: authorColorToUse,
      createdByEmail: user?.email || undefined
    };

    const newRemaining = Math.max(0, selectedLoan.remainingAmount - amount);
    const updatedLoan: Loan = {
      ...selectedLoan,
      remainingAmount: newRemaining,
      isCompleted: newRemaining <= 0
    };

    if (user) {
      saveTransaction(currentHouseholdId, receiptTransaction).catch(console.error);
      saveLoan(currentHouseholdId, updatedLoan).catch(console.error);
    }

    setData(prev => {
      const updatedLoans = prev.loans.map(l => l.id === selectedLoan.id ? updatedLoan : l);
      return {
        ...prev,
        transactions: [receiptTransaction, ...prev.transactions],
        loans: updatedLoans
      };
    });

    setIsReceiveLoanDialogOpen(false);
    setReceiveAmount('');
    setDisplayReceiveAmount('');
    setReceiveDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedLoan(null);
    toast.success('Recebimento registrado');
  };

  const resetTransactionForm = () => {
    setEditingTransactionId(null);
    setNewDescription('');
    setNewAmount('');
    setDisplayNewAmount('');
    setNewType('expense');
    setNewPocket('cash');
    setNewCategory('Geral');
    setIsAddingNewCategory(false);
    setCustomCategory('');
    setNewPerson('Jorge');
    setIsAddingNewPerson(false);
    setCustomPerson('');
    setNewLocation('');
    setNewPaymentMethod('pix');
    setNewCardId('');
    setNewDate(format(new Date(), 'yyyy-MM-dd'));
    setNewAuthorName(userProfile?.displayName || user?.displayName || 'Jorge');
    setNewAuthorColor((userProfile?.preferredColor as AuthorColor) || 'blue');
    setTransactionErrors({});
  };

  const handleEditTransaction = (t: Transaction) => {
    setEditingTransactionId(t.id);
    setNewDescription(t.description);
    setNewAmount(t.amount.toString());
    const { display } = maskCurrency(Math.round(t.amount * 100).toString());
    setDisplayNewAmount(display);
    
    if (t.type.startsWith('benefit_')) {
      setNewPocket('benefit');
      setNewType(t.type === 'benefit_income' ? 'income' : 'expense');
      setNewPerson(t.person || inferPersonFromDescription(t.description) || 'Jorge');
      setNewLocation(t.location || '');
    } else if (t.type === 'income' || t.type === 'loan_received') {
      setNewPocket('cash');
      setNewType('income');
    } else {
      setNewPocket('cash');
      setNewType('expense');
    }
    
    setNewPaymentMethod(t.paymentMethod || 'pix');
    setNewCardId(t.cardId || '');
    setNewCategory(t.category || 'Geral');
    setIsAddingNewCategory(false);
    setCustomCategory('');
    setNewDate(t.date || format(new Date(), 'yyyy-MM-dd'));
    setNewAuthorName(t.createdByName || userProfile?.displayName || user?.displayName || 'Jorge');
    setNewAuthorColor((t.createdByColor as AuthorColor) || (userProfile?.preferredColor as AuthorColor) || 'blue');
    setIsAddDialogOpen(true);
  };

  const handleUpdateBenefitMembers = (newMembers: string[]) => {
    setData(prev => ({
      ...prev,
      benefitMembers: newMembers
    }));

    if (user) {
      saveUserSettings(currentHouseholdId, data.categories || [], data.debtCategories || [], newMembers)
        .then(() => toast.success('Lista de titulares atualizada!'))
        .catch((e) => toast.error('Erro ao salvar titulares: ' + e.message));
    } else {
      toast.success('Lista de titulares atualizada!');
    }
  };

  const handleRenameBenefitMember = async (oldName: string, newName: string) => {
    const updatedMembers = (data.benefitMembers || ['Jorge', 'GO']).map(m => m === oldName ? newName : m);
    
    // Update local state: benefitMembers and any transactions with person === oldName
    setData(prev => ({
      ...prev,
      benefitMembers: updatedMembers,
      transactions: prev.transactions.map(t => {
        if (t.person === oldName) {
          return { ...t, person: newName };
        }
        return t;
      })
    }));

    if (user) {
      try {
        await saveUserSettings(currentHouseholdId, data.categories || [], data.debtCategories || [], updatedMembers);
        const txToUpdate = data.transactions.filter(t => t.person === oldName);
        for (const tx of txToUpdate) {
          await saveTransaction(currentHouseholdId, { ...tx, person: newName });
        }
      } catch (e: any) {
        console.error('Error saving updated benefit member:', e);
      }
    }
  };

  const handleUnifyAuthorNames = async (oldName: string, newName: string, newColor?: AuthorColor) => {
    // 1. Update in local memory state and cache immediately
    setData(prev => {
      const updated = {
        ...prev,
        transactions: prev.transactions.map(t => {
          const current = (t.createdByName || 'Jorge').trim().toLowerCase();
          if (current === oldName.trim().toLowerCase()) {
            return {
              ...t,
              createdByName: newName,
              ...(newColor ? { createdByColor: newColor } : {})
            };
          }
          return t;
        })
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setNewAuthorName(newName);
    if (newColor) {
      setNewAuthorColor(newColor);
    }

    // 2. Persist in Firestore if user is authenticated
    if (user) {
      const count = await updateAuthorNameInAllTransactions(currentHouseholdId, [oldName], newName, newColor);
      toast.success(`${count} transação(ões) padronizada(s) para "${newName}"!`);
    } else {
      toast.success(`Transações padronizadas para "${newName}"!`);
    }
  };

  const handleOpenAddModal = (pocket: 'cash' | 'benefit', type: 'income' | 'expense' = 'expense', person?: string) => {
    resetTransactionForm();
    setNewPocket(pocket);
    setNewType(type);
    if (person) {
      setNewPerson(person);
    }
    if (pocket === 'benefit') {
      setNewCategory(type === 'expense' ? 'Supermercado' : 'Alimentação');
    }
    setIsAddDialogOpen(true);
  };

  const resetDebtForm = () => {
    setEditingDebtId(null);
    setDebtDescription('');
    setDebtTotal('');
    setDisplayDebtTotal('');
    setDebtInstallments('1');
    setDebtCategory('Geral');
    setDebtCardId('');
    setIsAddingNewDebtCategory(false);
    setCustomDebtCategory('');
    setDebtStartDate(format(new Date(), 'yyyy-MM-dd'));
    setDebtErrors({});
  };

  const resetLoanForm = () => {
    setEditingLoanId(null);
    setLoanDescription('');
    setLoanTotal('');
    setDisplayLoanTotal('');
    setLoanBorrower('');
    setLoanInstallments('1');
    setLoanStartDate(format(new Date(), 'yyyy-MM-dd'));
    setLoanErrors({});
  };

  const handleDeleteTransaction = (id: string) => {
    if (user) {
      deleteTransactionFromDb(currentHouseholdId, id).catch(console.error);
    }
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
    toast.success('Lançamento removido');
  };

  const requestDeleteTransaction = (t: Transaction) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Excluir Lançamento?',
      description: 'Tem certeza que deseja excluir este lançamento? Esta ação removerá o registro inclusive do banco de dados na nuvem e não poderá ser desfeita.',
      itemName: t.description,
      itemDetail: `${formatCurrency(t.amount)} • ${t.category} • ${format(parseISO(t.date), 'dd/MM/yyyy')}`,
      onConfirm: () => handleDeleteTransaction(t.id)
    });
  };

  const handleDeleteDebt = (id: string) => {
    if (user) {
      deleteDebtFromDb(currentHouseholdId, id).catch(console.error);
    }
    setData(prev => ({
      ...prev,
      debts: prev.debts.filter(d => d.id !== id)
    }));
    toast.success('Dívida removida');
  };

  const requestDeleteDebt = (debt: Debt) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Excluir Dívida?',
      description: 'Tem certeza que deseja excluir esta dívida? Esta ação removerá o registro inclusive do banco de dados na nuvem.',
      itemName: debt.description,
      itemDetail: `Restante: ${formatCurrency(debt.remainingAmount)} de ${formatCurrency(debt.totalAmount)} • ${debt.category}`,
      onConfirm: () => handleDeleteDebt(debt.id)
    });
  };

  const handleDeleteLoan = (id: string) => {
    if (user) {
      deleteLoanFromDb(currentHouseholdId, id).catch(console.error);
    }
    setData(prev => ({
      ...prev,
      loans: prev.loans.filter(l => l.id !== id)
    }));
    toast.success('Empréstimo removido');
  };

  const requestDeleteLoan = (loan: Loan) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Excluir Valor a Receber?',
      description: 'Tem certeza que deseja excluir este valor a receber? Esta ação removerá o registro inclusive do banco de dados na nuvem.',
      itemName: loan.borrowerName,
      itemDetail: `${loan.description} • Restante: ${formatCurrency(loan.remainingAmount)} de ${formatCurrency(loan.totalAmount)}`,
      onConfirm: () => handleDeleteLoan(loan.id)
    });
  };

  const requestDeleteCategory = (category: string) => {
    const usage = data.transactions.filter(t => t.category === category);
    if (usage.length > 0) {
      const examples = usage.slice(0, 3).map(t => t.description).join(', ');
      toast.error(`Não é possível excluir "${category}". Ela está sendo usada em ${usage.length} lançamentos (ex: ${examples}).`);
      return;
    }
    setDeleteConfirmation({
      isOpen: true,
      title: 'Excluir Categoria?',
      description: 'Tem certeza que deseja remover esta categoria de lançamentos?',
      itemName: category,
      onConfirm: () => handleDeleteCategory(category)
    });
  };

  const requestDeleteDebtCategory = (category: string) => {
    const usage = data.debts.filter(d => d.category === category);
    if (usage.length > 0) {
      const examples = usage.slice(0, 3).map(d => d.description).join(', ');
      toast.error(`Não é possível excluir "${category}". Ela está sendo usada em ${usage.length} dívidas (ex: ${examples}).`);
      return;
    }
    setDeleteConfirmation({
      isOpen: true,
      title: 'Excluir Categoria de Dívida?',
      description: 'Tem certeza que deseja remover esta categoria de dívida?',
      itemName: category,
      onConfirm: () => handleDeleteDebtCategory(category)
    });
  };

  const handleSaveCard = (card: CreditCardType) => {
    if (user) {
      saveCreditCard(currentHouseholdId, card).catch(console.error);
    }
    setData(prev => {
      const cards = prev.creditCards || [];
      const existing = cards.findIndex(c => c.id === card.id);
      if (existing >= 0) {
        const updated = [...cards];
        updated[existing] = card;
        return { ...prev, creditCards: updated };
      }
      return { ...prev, creditCards: [...cards, card] };
    });
  };

  const handleDeleteCard = (id: string) => {
    if (user) {
      deleteCreditCardFromDb(currentHouseholdId, id).catch(console.error);
    }
    setData(prev => ({
      ...prev,
      creditCards: (prev.creditCards || []).filter(c => c.id !== id)
    }));
  };

  const handleReplicateTransaction = (template: Transaction) => {
    const authorNameToUse = userProfile?.displayName || user?.displayName || 'Jorge';
    const authorColorToUse = (userProfile?.preferredColor as AuthorColor) || 'blue';

    const newTransaction: Transaction = {
      ...template,
      id: crypto.randomUUID(),
      date: format(new Date(), 'yyyy-MM-dd'),
      createdByUid: user?.uid,
      createdByName: authorNameToUse,
      createdByColor: authorColorToUse,
      createdByEmail: user?.email || undefined
    };

    if (user) {
      saveTransaction(currentHouseholdId, newTransaction).catch(console.error);
    }
    
    setData(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions]
    }));
    
    toast.success(`"${template.description}" lançado com sucesso!`);
  };

  const handleDeleteCategory = (category: string) => {
    const usage = data.transactions.filter(t => t.category === category);
    if (usage.length > 0) {
      const examples = usage.slice(0, 3).map(t => t.description).join(', ');
      toast.error(`Não é possível excluir "${category}". Ela está sendo usada em ${usage.length} lançamentos (ex: ${examples}).`);
      return;
    }

    const newCategories = data.categories?.filter(c => c !== category) || [];
    if (user) {
      saveUserSettings(currentHouseholdId, newCategories, data.debtCategories || []).catch(console.error);
    }

    setData(prev => ({
      ...prev,
      categories: newCategories
    }));
    toast.success(`Categoria "${category}" removida`);
  };

  const handleDeleteDebtCategory = (category: string) => {
    const usage = data.debts.filter(d => d.category === category);
    if (usage.length > 0) {
      const examples = usage.slice(0, 3).map(d => d.description).join(', ');
      toast.error(`Não é possível excluir "${category}". Ela está sendo usada em ${usage.length} dívidas (ex: ${examples}).`);
      return;
    }

    const newDebtCats = data.debtCategories?.filter(c => c !== category) || [];
    if (user) {
      saveUserSettings(currentHouseholdId, data.categories || [], newDebtCats).catch(console.error);
    }

    setData(prev => ({
      ...prev,
      debtCategories: newDebtCats
    }));
    toast.success(`Categoria de dívida "${category}" removida`);
  };

  const handleMigrateLocalData = async () => {
    if (!user) return;
    const toastId = toast.loading('Enviando dados locais para o Firestore...');
    try {
      await migrateLocalDataToFirestore(currentHouseholdId, data, user);
      toast.success('Todos os dados locais foram salvos no Firebase com sucesso!', { id: toastId });
    } catch (err: any) {
      toast.error('Erro ao migrar dados: ' + (err?.message || 'Erro'), { id: toastId });
    }
  };

  const exportToJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_financas_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    toast.success('Backup JSON exportado');
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.transactions.map(t => ({
      Descrição: t.description,
      Valor: t.amount,
      Data: t.date,
      Categoria: t.category,
      Tipo: t.type === 'income' ? 'Ganho' : t.type === 'expense' ? 'Gasto' : t.type === 'debt_payment' ? 'Pagamento Dívida' : 'Empréstimo Recebido',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transações");
    XLSX.writeFile(wb, `backup_financas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Backup Excel exportado');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (importedData.transactions && Array.isArray(importedData.transactions)) {
          const formattedData: FinanceData = {
            ...importedData,
            transactions: importedData.transactions.map((t: any) => ({
              ...t,
              id: t.id || crypto.randomUUID(),
              createdByName: t.createdByName || userProfile?.displayName || user?.displayName || 'Jorge',
              createdByColor: t.createdByColor || (userProfile?.preferredColor as AuthorColor) || 'blue',
              createdByUid: t.createdByUid || user?.uid
            })),
            debts: (importedData.debts || []).map((d: any) => ({ ...d, id: d.id || crypto.randomUUID() })),
            loans: (importedData.loans || []).map((l: any) => ({ ...l, id: l.id || crypto.randomUUID() })),
            creditCards: (importedData.creditCards || []).map((c: any) => ({ ...c, id: c.id || crypto.randomUUID() })),
            categories: importedData.categories || data.categories || ['Geral', 'Alimentação', 'Lazer', 'Transporte', 'Saúde', 'Educação'],
            debtCategories: importedData.debtCategories || data.debtCategories || ['Geral', 'Casa', 'Veículo', 'Pessoal'],
            benefitMembers: importedData.benefitMembers || data.benefitMembers || ['Jorge', 'GO']
          };

          // 1. Update React state immediately
          setData(formattedData);

          // 2. Persist to localStorage cache
          localStorage.setItem(STORAGE_KEY, JSON.stringify(formattedData));

          // 3. If connected to Firebase / Cloud, immediately save and persist to Firestore!
          if (user) {
            const toastId = toast.loading('Sincronizando e salvando backup na nuvem...');
            try {
              await migrateLocalDataToFirestore(currentHouseholdId, formattedData, user);
              toast.success(`Backup restaurado e salvo na nuvem com sucesso! (${formattedData.transactions.length} transações salvas)`, { id: toastId });
            } catch (err: any) {
              console.error('Erro ao salvar backup no Firestore:', err);
              toast.error('Dados carregados localmente, mas ocorreu um erro ao salvar na nuvem: ' + (err?.message || 'Erro desconhecido'), { id: toastId });
            }
          } else {
            toast.success(`Backup importado com sucesso! (${formattedData.transactions.length} transações carregadas). Conecte sua conta para sincronizar na nuvem.`);
          }
        } else {
          toast.error('Formato de arquivo inválido. Certifique-se de que é um backup do Controle Financeiro.');
        }
      } catch (err: any) {
        console.error('Erro ao ler arquivo JSON:', err);
        toast.error('Erro ao ler arquivo JSON');
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-white p-4 md:p-8 max-w-7xl mx-auto font-sans relative overflow-x-hidden">
      <div className="fixed top-[-5%] left-[-5%] w-[30%] h-[30%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <header className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 mb-8 sm:mb-10">
        {/* Canto Superior Esquerdo: Engrenagem de Configurações & Título */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="h-11 w-11 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/20 group shadow-sm shrink-0" title="Configurações e Perfil">
              <Settings className="h-5 w-5 text-zinc-300 group-hover:rotate-45 transition-transform duration-300" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 bg-[#0d0e14]/95 border-white/10 text-white rounded-2xl shadow-2xl p-2 font-sans backdrop-blur-2xl">
              {user ? (
                <>
                  <div className="px-3 py-2.5 bg-white/[0.04] rounded-xl border border-white/5 mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                        {(userProfile?.displayName || user.displayName || 'J').charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-xs text-white truncate">{userProfile?.displayName || user.displayName || 'Jorge'}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-white/5" />
                </>
              ) : null}

              <DropdownMenuItem 
                onClick={() => {
                  setSettingsTab('profile');
                  setIsCoupleModalOpen(true);
                }} 
                className="hover:bg-white/10 cursor-pointer py-2.5 px-3 rounded-xl text-xs flex items-center gap-2.5 font-medium text-zinc-200 hover:text-white"
              >
                <Users className="h-4 w-4 text-blue-400" />
                <span>Meu Perfil & Cores</span>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => {
                  setSettingsTab('benefits');
                  setIsCoupleModalOpen(true);
                }} 
                className="hover:bg-white/10 cursor-pointer py-2.5 px-3 rounded-xl text-xs flex items-center gap-2.5 font-medium text-zinc-200 hover:text-white"
              >
                <CreditCard className="h-4 w-4 text-indigo-400" />
                <span>Titulares VR / VA</span>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => {
                  setSettingsTab('couple');
                  setIsCoupleModalOpen(true);
                }} 
                className="hover:bg-white/10 cursor-pointer py-2.5 px-3 rounded-xl text-xs flex items-center justify-between font-medium text-zinc-200 hover:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="h-4 w-4 text-pink-400 fill-pink-500/20" />
                  <span>Espaço do Casal</span>
                </div>
                {household && household.members.length > 1 ? (
                  <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded font-bold">
                    Conectado
                  </span>
                ) : (
                  <span className="text-[10px] bg-white/10 text-zinc-400 px-1.5 py-0.5 rounded">
                    Conectar
                  </span>
                )}
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => {
                  setSettingsTab('backup');
                  setIsCoupleModalOpen(true);
                }} 
                className="hover:bg-white/10 cursor-pointer py-2.5 px-3 rounded-xl text-xs flex items-center gap-2.5 font-medium text-zinc-200 hover:text-white"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <span>Exportar & Backups</span>
              </DropdownMenuItem>

              <PWAInstallButton variant="menu-item" />

              <DropdownMenuSeparator className="bg-white/5" />

              <DropdownMenuItem 
                onClick={() => setIsManageCategoriesOpen(true)} 
                className="hover:bg-white/10 cursor-pointer py-2 px-3 rounded-xl text-xs flex items-center gap-2.5 text-zinc-300 hover:text-white font-medium"
              >
                <Sliders className="h-4 w-4 text-purple-400" />
                <span>Gerenciar Categorias</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/5" />

              {user ? (
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      await firebaseSignOut(auth);
                      toast.success('Desconectado com sucesso!');
                    } catch (e: any) {
                      toast.error('Erro ao sair: ' + e.message);
                    }
                  }} 
                  className="hover:bg-red-500/15 cursor-pointer py-2 px-3 rounded-xl text-xs flex items-center gap-2.5 text-red-400 font-medium"
                >
                  <LogOut className="h-4 w-4 text-red-400" />
                  <span>Sair da Conta Google</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={() => setIsAuthModalOpen(true)} 
                  className="hover:bg-emerald-500/15 cursor-pointer py-2 px-3 rounded-xl text-xs flex items-center gap-2.5 text-emerald-400 font-medium"
                >
                  <LogIn className="h-4 w-4 text-emerald-400" />
                  <span>Entrar / Sincronizar Nuvem</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">Controle Financeiro</h1>
          </div>
        </div>

        {/* Centro: Switcher de Abas (Dashboard vs Transações) */}
        <nav className="bg-white/5 p-1.5 rounded-[1.25rem] backdrop-blur-md border border-white/10 flex items-center relative w-[280px] sm:w-[320px] h-11 sm:h-12 self-center overflow-hidden">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`relative z-10 flex-1 h-full rounded-xl text-[11px] sm:text-sm font-bold transition-colors duration-300 ${
              activeTab === 'dashboard' ? 'text-black' : 'text-muted-foreground hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`relative z-10 flex-1 h-full rounded-xl text-[11px] sm:text-sm font-bold transition-colors duration-300 ${
              activeTab === 'transactions' ? 'text-black' : 'text-muted-foreground hover:text-white'
            }`}
          >
            Transações
          </button>
          <motion.div
            className="absolute top-1.5 bottom-1.5 left-1.5 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            initial={false}
            animate={{
              x: activeTab === 'dashboard' ? '0%' : '100%',
              width: 'calc(50% - 6px)'
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        </nav>

        {/* Canto Superior Direito: Botão Adicionar & Instalar PWA */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <PWAInstallButton variant="header" />

          <DropdownMenu>
            <DropdownMenuTrigger className="bg-white text-black hover:bg-white/90 rounded-2xl font-bold inline-flex items-center justify-center h-11 px-5 py-2 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/20 shadow-lg shadow-white/5">
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#0d0e14] border-white/10 text-white rounded-2xl shadow-2xl p-1.5">
              <DropdownMenuItem onClick={() => setIsAddDialogOpen(true)} className="hover:bg-white/10 cursor-pointer py-2.5 px-3 rounded-xl">
                <TrendingDown className="mr-2.5 h-4 w-4 text-red-400" /> Novo Lançamento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsLoanDialogOpen(true)} className="hover:bg-white/10 cursor-pointer py-2.5 px-3 rounded-xl">
                <Users className="mr-2.5 h-4 w-4 text-green-400" /> Me Devem
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={() => setIsDebtDialogOpen(true)} className="hover:bg-white/10 cursor-pointer py-2.5 px-3 rounded-xl">
                <CreditCard className="mr-2.5 h-4 w-4 text-purple-400" /> Nova Dívida
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".json" 
            onChange={handleImport}
          />
        </div>
      </header>

      {activeTab === 'dashboard' ? (
        <div className="flex flex-col gap-6 md:gap-8">
          {/* Seção 1: Saldos Globais (Acumulado) */}
          <section>
            <div className="flex items-center gap-2 mb-4 px-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Suas Carteiras (Saldos Totais)</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Carteira Principal (Dinheiro) */}
              <CashSummaryCard
                transactions={data.transactions}
                members={data.benefitMembers || ['Jorge', 'GO']}
                availableAuthors={availableAuthors}
                onOpenAddModal={(pocket, type, authorName) => handleOpenAddModal('cash', type || 'expense', authorName)}
                onViewTransactions={(authorFilterParam) => {
                  setWalletFilter('cash');
                  if (authorFilterParam) setAuthorFilter(authorFilterParam);
                  else setAuthorFilter('all');
                  setActiveTab('transactions');
                }}
              />

              {/* Carteira VR / VA (Benefícios) */}
              <BenefitSummaryCard
                transactions={data.transactions}
                members={data.benefitMembers || ['Jorge', 'GO']}
                onOpenAddModal={(pocket, type, person) => handleOpenAddModal(pocket, type || 'income', person)}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onUpdateMembers={handleUpdateBenefitMembers}
              />

              {/* Cartões de Crédito */}
              <CreditCardsSummaryCard
                cards={data.creditCards || []}
                debts={data.debts || []}
                transactions={data.transactions || []}
                currentMonth={currentMonth}
                onOpenManageCards={() => setIsManageCardsModalOpen(true)}
              />
            </div>
          </section>

          {/* Seção 2: Fluxo Mensal */}
          <section>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 px-2 gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Fluxo do Mês</h2>
              </div>
              <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="hover:bg-white/10 h-7 w-7 rounded-lg">
                  <ChevronLeft className="h-4 w-4 text-zinc-400" />
                </Button>
                <span className="text-xs font-bold text-white capitalize w-28 text-center tracking-wide">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="hover:bg-white/10 h-7 w-7 rounded-lg">
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
              {/* Quick Stats Column (Entradas & Saídas) */}
              <div className="md:col-span-4 flex flex-col gap-4">
                {/* Sliding Switch / Toggle Header */}
                <div className="bg-zinc-900/50 p-2 sm:p-2.5 rounded-2xl border border-white/5 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 px-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${statsWalletType === 'cash' ? 'bg-indigo-400' : 'bg-emerald-400'} animate-pulse`} />
                    <span className="text-xs font-semibold text-zinc-300">
                      {statsWalletType === 'cash' ? 'Visão Mensal: Conta Corrente' : 'Visão Mensal: Benefícios (VR/VA)'}
                    </span>
                  </div>

                  {/* Chave Deslizante Segmentada */}
                  <div className="bg-black/50 p-1 rounded-xl border border-white/10 flex items-center relative w-full sm:w-[260px] h-10 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setStatsWalletType('cash')}
                      className={`relative z-10 flex-1 h-full rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                        statsWalletType === 'cash' ? 'text-black font-extrabold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Dinheiro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatsWalletType('benefit')}
                      className={`relative z-10 flex-1 h-full rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                        statsWalletType === 'benefit' ? 'text-black font-extrabold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      <span>VR / VA</span>
                    </button>
                    <motion.div
                      className="absolute top-1 bottom-1 left-1 bg-white rounded-lg shadow-[0_2px_10px_rgba(255,255,255,0.2)]"
                      initial={false}
                      animate={{
                        x: statsWalletType === 'cash' ? '0%' : '100%',
                        width: 'calc(50% - 4px)'
                      }}
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  </div>
                </div>

                {/* 3 Stat Cards Grid (Entradas, Saídas, Saldo do Mês) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                  {/* Quick Stats - Entradas */}
                  <div className={`relative overflow-hidden bg-zinc-900/50 p-6 rounded-[2.5rem] border backdrop-blur-md flex flex-col justify-between transition-all hover:bg-zinc-900/80 ${
                statsWalletType === 'benefit' ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-white/5 hover:border-green-500/30'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-500/10 p-2.5 rounded-2xl border border-green-500/20">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      statsWalletType === 'benefit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                    }`}>
                      {statsWalletType === 'benefit' ? 'VR Recargas' : 'Dinheiro'}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    (statsWalletType === 'cash' ? stats.mainIncomeChange : stats.benefitIncomeChange) >= 0 
                      ? 'bg-green-400/20 text-green-400' 
                      : 'bg-red-400/20 text-red-400'
                  }`}>
                    {(statsWalletType === 'cash' ? stats.mainIncomeChange : stats.benefitIncomeChange) >= 0 ? '+' : ''}
                    {(statsWalletType === 'cash' ? stats.mainIncomeChange : stats.benefitIncomeChange).toFixed(0)}%
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {statsWalletType === 'benefit' ? 'Total Entradas VR' : 'Entradas (Dinheiro)'}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                    {formatCurrency(statsWalletType === 'cash' ? stats.mainIncome : stats.benefitIncome)}
                  </h3>

                  {statsWalletType === 'benefit' ? (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5 text-[10px]">
                      {(data.benefitMembers || ['Jorge', 'GO']).map(member => (
                        <div key={member} className="bg-white/5 px-2 py-1 rounded-lg text-emerald-400 font-medium">
                          <span className="text-muted-foreground">{member}:</span> +{formatCurrency(stats.benefitIncomeByMember[member] || 0)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-2 opacity-70">
                      Salários, transferências e depósitos recebidos
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Stats - Saídas */}
              <div className={`relative overflow-hidden bg-zinc-900/50 p-6 rounded-[2.5rem] border backdrop-blur-md flex flex-col justify-between transition-all hover:bg-zinc-900/80 ${
                statsWalletType === 'benefit' ? 'border-amber-500/20 hover:border-amber-500/40' : 'border-white/5 hover:border-red-500/30'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="bg-red-500/10 p-2.5 rounded-2xl border border-red-500/20">
                      <TrendingDown className="h-5 w-5 text-red-400" />
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      statsWalletType === 'benefit' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                    }`}>
                      {statsWalletType === 'benefit' ? 'VR Gastos' : 'Dinheiro'}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    (statsWalletType === 'cash' ? stats.mainExpenseChange : stats.benefitExpenseChange) <= 0 
                      ? 'bg-green-400/20 text-green-400' 
                      : 'bg-red-400/20 text-red-400'
                  }`}>
                    {(statsWalletType === 'cash' ? stats.mainExpenseChange : stats.benefitExpenseChange) > 0 ? '+' : ''}
                    {(statsWalletType === 'cash' ? stats.mainExpenseChange : stats.benefitExpenseChange).toFixed(0)}%
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {statsWalletType === 'benefit' ? 'Total Saídas VR' : 'Saídas (Dinheiro)'}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                    {formatCurrency(statsWalletType === 'cash' ? stats.mainExpense : stats.benefitExpense)}
                  </h3>

                  {statsWalletType === 'benefit' ? (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5 text-[10px]">
                      {(data.benefitMembers || ['Jorge', 'GO']).map(member => (
                        <div key={member} className="bg-white/5 px-2 py-1 rounded-lg text-amber-400 font-medium">
                          <span className="text-muted-foreground">{member}:</span> -{formatCurrency(stats.benefitExpenseByMember[member] || 0)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-2 opacity-70">
                      Despesas fixas, variáveis, boletos e dívidas pagas
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Stats - Saldo Mensal */}
              <div className={`relative overflow-hidden bg-zinc-900/50 p-6 rounded-[2.5rem] border backdrop-blur-md flex flex-col justify-between transition-all hover:bg-zinc-900/80 ${
                statsWalletType === 'benefit' ? 'border-teal-500/20 hover:border-teal-500/40' : 'border-blue-500/20 hover:border-blue-500/40'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-500/10 p-2.5 rounded-2xl border border-blue-500/20">
                      <Wallet className="h-5 w-5 text-blue-400" />
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      statsWalletType === 'benefit' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {statsWalletType === 'benefit' ? 'VR Sobra' : 'Dinheiro'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {statsWalletType === 'benefit' ? 'Balanço VR Acumulado' : 'Saldo Acumulado (Fim do Mês)'}
                  </p>
                  <h3 className={`text-2xl sm:text-3xl font-bold mt-1 ${
                    (statsWalletType === 'cash' ? stats.accumulatedMainBalance : stats.accumulatedBenefitBalance) >= 0 ? 'text-blue-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(statsWalletType === 'cash' ? stats.accumulatedMainBalance : stats.accumulatedBenefitBalance)}
                  </h3>

                  {statsWalletType === 'benefit' ? (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5 text-[10px]">
                      {(data.benefitMembers || ['Jorge', 'GO']).map(member => {
                        const balance = stats.accumulatedBenefitByMember[member] || 0;
                        return (
                          <div key={member} className="bg-white/5 px-2 py-1 rounded-lg font-medium">
                            <span className="text-muted-foreground">{member}:</span> 
                            <span className={balance >= 0 ? 'text-teal-400' : 'text-red-400'}>
                              {' '}{balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-2 opacity-70">
                      Saldo total disponível até o fim deste mês
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Area Chart */}
          <Card className="md:col-span-3 bg-zinc-900/40 border-white/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden transition-all hover:border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5 mx-6 px-0 mb-4">
              <div>
                <CardTitle className="text-sm font-semibold text-white">Análise Temporal</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">Últimos 6 meses de fluxo financeiro</CardDescription>
              </div>
              <div className="bg-white/5 px-3 py-1 rounded-full text-[10px] text-muted-foreground font-medium border border-white/5">Ganhos vs Gastos</div>
            </CardHeader>
            <CardContent className="h-[280px] min-w-0 min-h-[280px] p-0 px-2 pb-4 relative w-full">
              <div className="w-full h-full min-h-[260px] min-w-0">
                <ResponsiveContainer width="99%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff03" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} dy={10} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
                      itemStyle={{ fontSize: '11px', color: '#fff', padding: '2px 0' }}
                      labelStyle={{ color: '#888', fontSize: '10px', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}
                      formatter={(v: any, name: string) => [
                        formatCurrency(v),
                        name === 'income' ? 'Ganhos' : 'Gastos'
                      ]}
                    />
                    <Area type="monotone" dataKey="income" stroke="#22c55e" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} name="income" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#22c55e' }} />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} name="expense" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#ef4444' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution Pie */}
          <Card className="md:col-span-1 bg-zinc-900/40 border-white/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden transition-all hover:border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5 mx-6 px-0 mb-4">
              <CardTitle className="text-sm font-semibold text-white">Categorias</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px] flex flex-col items-center justify-center p-6">
              {categoryData.length > 0 ? (
                <>
                  <div className="w-full h-40 min-w-0 min-h-[160px] relative">
                    <ResponsiveContainer width="99%" height={160}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                          animationBegin={0}
                          animationDuration={1500}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                          itemStyle={{ fontSize: '11px', color: '#fff' }}
                          formatter={(v: any) => formatCurrency(v)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-6 w-full">
                    {categoryData.slice(0, 4).map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[9px] text-muted-foreground truncate font-semibold uppercase tracking-tighter">{entry.name}</span>
                      </div>
                    ))}
                    {categoryData.length > 4 && (
                      <div className="text-[9px] text-muted-foreground flex items-center bg-white/5 px-2 py-1 rounded-lg border border-white/5">+{categoryData.length - 4} mais</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 opacity-30">
                  <div className="bg-white/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PieChart className="h-6 w-6" />
                  </div>
                  <p className="text-[10px] uppercase font-bold tracking-widest">Sem lançamentos</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Couple / Member Contribution Breakdown Card */}
          <Card className="md:col-span-4 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-blue-500/10 border-white/10 rounded-[2.5rem] backdrop-blur-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/5 mx-6 px-0">
              <div className="flex items-center gap-3">
                <div className="bg-pink-500/20 p-2.5 rounded-2xl border border-pink-500/30">
                  <Heart className="h-5 w-5 text-pink-400 fill-pink-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    Visão do Casal ({format(currentMonth, 'MMMM yyyy', { locale: ptBR })})
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Acompanhamento de lançamentos e gastos por pessoa
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!user) {
                    setIsAuthModalOpen(true);
                  } else {
                    setIsCoupleModalOpen(true);
                  }
                }}
                className="bg-white/5 border-white/10 hover:bg-white/10 text-xs rounded-xl h-9 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 mr-1.5 text-pink-400" />
                Gerenciar Casal
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupleMonthlyBreakdown.map(author => {
                  return (
                    <div
                      key={author.name}
                      className={`p-4 rounded-2xl border backdrop-blur-sm transition-all hover:scale-[1.01] ${getAuthorBadgeStyle(author.color)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-current shadow-sm shadow-current/50" />
                          <span className="font-bold text-sm text-white">{author.name}</span>
                        </div>
                        <Badge className="text-[10px] bg-black/40 text-white/80 border-none">
                          {author.count} {author.count === 1 ? 'lançamento' : 'lançamentos'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                        <div>
                          <span className="text-[10px] uppercase text-zinc-400 font-semibold block">Gastos</span>
                          <span className="text-sm font-extrabold text-red-400 font-mono">
                            - {formatCurrency(author.totalExpense)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-zinc-400 font-semibold block">Entradas</span>
                          <span className="text-sm font-extrabold text-emerald-400 font-mono">
                            + {formatCurrency(author.totalIncome)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions / Pending - Only show on dashboard for convenience */}
          {pendingDebtsForMonth.length > 0 && (
            <Card className="md:col-span-4 bg-yellow-500/5 border-yellow-500/20 rounded-[2.5rem] backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-yellow-500/10 mx-6 px-0 mb-2">
                <div className="flex items-center gap-3">
                   <div className="bg-yellow-500/20 p-2 rounded-xl">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                   </div>
                   <CardTitle className="text-sm font-bold text-yellow-500 uppercase tracking-widest">Contas Pendentes este Mês</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingDebtsForMonth.map(debt => (
                  <div key={debt.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 transition-all hover:bg-black/40">
                    <div>
                      <p className="text-xs font-bold text-white">{debt.description}</p>
                      <p className="text-[10px] text-muted-foreground uppercase opacity-70">Sugerido: {formatCurrency(debt.monthlyAmount)}</p>
                    </div>
                    <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold h-9 rounded-xl shadow-lg shadow-yellow-500/10" onClick={() => {
                      setSelectedDebt(debt);
                      setPayAmount(debt.monthlyAmount.toFixed(2));
                      const { display } = maskCurrency(Math.round(debt.monthlyAmount * 100).toString());
                      setDisplayPayAmount(display);
                      setPayDate(format(new Date(), 'yyyy-MM-dd'));
                      setIsPayDebtDialogOpen(true);
                    }}>
                      Pagar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        </section>
      </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full md:w-auto bg-white/5 p-1 rounded-xl border border-white/10">
                <TabsList className="grid w-full grid-cols-2 bg-transparent">
                  <TabsTrigger value="monthly" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-lg">Mensal</TabsTrigger>
                  <TabsTrigger value="total" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-lg">Geral</TabsTrigger>
                </TabsList>
              </Tabs>

              {viewMode === 'monthly' && (
                <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10 w-full md:w-auto justify-between backdrop-blur-md">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="hover:bg-white/10 h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold capitalize tracking-wide">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="hover:bg-white/10 h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {viewMode === 'monthly' && pendingDebtsForMonth.length > 0 && (
              <Card className="border-yellow-500/30 bg-yellow-500/5 rounded-[1.5rem] backdrop-blur-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2 text-yellow-500/80 uppercase tracking-widest font-bold">
                    <AlertCircle className="h-4 w-4" />
                    Atenção: Cobranças Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingDebtsForMonth.map(debt => (
                    <div key={debt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md">
                      <div>
                        <p className="text-sm font-bold text-white mb-1 sm:mb-0.5">{debt.description}</p>
                        <p className="text-[11px] sm:text-[10px] text-muted-foreground uppercase tracking-tight">Parcela sugerida: {formatCurrency(debt.monthlyAmount)}</p>
                      </div>
                      <Button size="sm" className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-9 sm:h-8 rounded-lg shrink-0" onClick={() => {
                        setSelectedDebt(debt);
                        setPayAmount(debt.monthlyAmount.toFixed(2));
                        const { display } = maskCurrency(Math.round(debt.monthlyAmount * 100).toString());
                        setDisplayPayAmount(display);
                        setPayDate(format(new Date(), 'yyyy-MM-dd'));
                        setIsPayDebtDialogOpen(true);
                      }}>
                        Registrar PGTO
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Wallet & Author Filter Controls */}
            <div className="space-y-2">
              {/* Wallet Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2 pb-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Conta:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWalletFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    walletFilter === 'all'
                      ? 'bg-white text-zinc-950 font-bold shadow-sm'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  Todos ({data.transactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWalletFilter('cash')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    walletFilter === 'cash'
                      ? 'bg-blue-500 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <Wallet className="w-3 h-3" /> Saldo Principal
                </button>
                <button
                  type="button"
                  onClick={() => setWalletFilter('benefit_all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    walletFilter === 'benefit_all'
                      ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm shadow-emerald-500/20'
                      : 'bg-white/5 text-emerald-400/80 hover:bg-emerald-500/10'
                  }`}
                >
                  <UtensilsCrossed className="w-3 h-3" /> VR / VA (Somado)
                </button>

                {(data.benefitMembers || ['Jorge', 'GO']).map(m => {
                  const isSelected = walletFilter === `benefit_member:${m}`;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWalletFilter(`benefit_member:${m}`)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-teal-400 text-zinc-950 font-bold shadow-sm shadow-teal-400/20'
                          : 'bg-white/5 text-teal-300/80 hover:bg-teal-500/10'
                      }`}
                    >
                      VR - {m}
                    </button>
                  );
                })}
              </div>

              {/* Author Filter Buttons (Quem Lançou?) */}
              <div className="flex flex-wrap items-center gap-2 pb-2 pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                  <Users className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Por Autor:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthorFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    authorFilter === 'all'
                      ? 'bg-white text-zinc-950 font-bold shadow-sm'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  Todos os Membros
                </button>
                {availableAuthors.map(a => {
                  const isSelected = authorFilter.toLowerCase() === a.name.toLowerCase();
                  return (
                    <button
                      key={a.name}
                      type="button"
                      onClick={() => setAuthorFilter(isSelected ? 'all' : a.name)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                        isSelected
                          ? `${getAuthorBadgeStyle(a.color)} ring-1 ring-white/40 font-bold shadow-sm`
                          : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md rounded-[2rem] overflow-hidden">
              <CardHeader className="border-b border-white/5 mx-6 px-0 pb-6 mb-2">
                <CardTitle className="text-lg font-semibold text-white">Histórico</CardTitle>
                <CardDescription className="text-muted-foreground/60">
                  {filteredTransactions.length === 0 
                    ? 'Nenhum lançamento encontrado para este período.' 
                    : `Mostrando ${filteredTransactions.length} lançamentos.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile View */}
                <div className="md:hidden flex flex-col divide-y divide-white/5">
                  {filteredTransactions.map((t) => (
                    <div key={t.id} className="p-4 hover:bg-white/5 transition-colors group">
                      <div className="flex justify-between items-start mb-2.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-[15px] leading-tight">{t.description}</span>
                          <span className="text-[11px] text-muted-foreground mt-1 tracking-wide uppercase">
                            {format(parseISO(t.date), 'dd/MM/yy')}
                          </span>
                        </div>
                        <span className={`text-right font-bold text-lg whitespace-nowrap tracking-tight ${(t.type === 'income' || t.type === 'loan_received' || t.type === 'benefit_income') ? 'text-emerald-400' : 'text-red-400'}`}>
                          {(t.type === 'income' || t.type === 'loan_received' || t.type === 'benefit_income') ? '+' : '-'} {formatCurrency(t.amount)}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between gap-y-3">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {/* Visual Author Tag */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${getAuthorBadgeStyle(t.createdByColor)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {t.createdByName || 'Jorge'}
                          </span>
                          
                          <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md font-medium">{t.category}</span>
                          
                          {t.type.startsWith('benefit_') && (
                            <>
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                                VR/VA
                              </span>
                              <span className="text-[10px] text-teal-300 font-semibold bg-teal-400/10 px-1.5 py-0.5 rounded border border-teal-400/20">
                                {t.person || inferPersonFromDescription(t.description) || 'Geral'}
                              </span>
                              {t.location && (
                                <span className="text-[10px] text-amber-300/90 font-medium bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 flex items-center gap-1">
                                  📍 {t.location}
                                </span>
                              )}
                            </>
                          )}
                          {t.type === 'debt_payment' && (
                            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider bg-red-400/10 px-1.5 py-0.5 rounded">Dívida</span>
                          )}
                          {t.type === 'loan_received' && (
                            <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider bg-green-400/10 px-1.5 py-0.5 rounded">Empréstimo</span>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-blue-400 bg-white/5 hover:bg-blue-500/20 rounded-xl"
                            onClick={() => handleEditTransaction(t)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-red-500 bg-white/5 hover:bg-red-500/20 rounded-xl"
                            onClick={() => requestDeleteTransaction(t)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="hover:bg-transparent border-white/5">
                        <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground/60 pl-8">Data</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Descrição & Autor</TableHead>
                        <TableHead className="text-right text-[10px] uppercase tracking-widest text-muted-foreground/60 pr-8">Valor</TableHead>
                        <TableHead className="text-right text-[10px] uppercase tracking-widest text-muted-foreground/60 pr-8">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((t) => (
                        <TableRow key={t.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                          <TableCell className="text-[11px] text-muted-foreground pl-8 whitespace-nowrap">
                            {format(parseISO(t.date), 'dd/MM/yy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col py-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-white text-base">{t.description}</span>
                                
                                {/* Visual Author Tag */}
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${getAuthorBadgeStyle(t.createdByColor)}`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                  {t.createdByName || 'Jorge'}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5 items-center mt-1">
                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">{t.category}</span>
                                {t.type.startsWith('benefit_') && (
                                  <>
                                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                                      VR/VA
                                    </span>
                                    <span className="text-[9px] text-teal-300 font-semibold bg-teal-400/10 px-1.5 py-0.5 rounded border border-teal-400/20">
                                      {t.person || inferPersonFromDescription(t.description) || 'Geral'}
                                    </span>
                                    {t.location && (
                                      <span className="text-[9px] text-amber-300/90 font-medium bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 flex items-center gap-1">
                                        📍 {t.location}
                                      </span>
                                    )}
                                  </>
                                )}
                                {t.type === 'debt_payment' && (
                                  <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider bg-red-400/10 w-fit px-1.5 py-0.5 rounded">Dívida</span>
                                )}
                                {t.type === 'loan_received' && (
                                  <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider bg-green-400/10 w-fit px-1.5 py-0.5 rounded">Empréstimo</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={`text-right font-bold text-lg pr-8 whitespace-nowrap ${(t.type === 'income' || t.type === 'loan_received' || t.type === 'benefit_income') ? 'text-emerald-400' : 'text-red-400'}`}>
                            {(t.type === 'income' || t.type === 'loan_received' || t.type === 'benefit_income') ? '+' : '-'} {formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleEditTransaction(t)}
                                title="Editar lançamento"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => requestDeleteTransaction(t)}
                                title="Excluir lançamento"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="w-full md:w-96 space-y-6">
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md rounded-[2rem]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white">Me Devem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.loans.length === 0 ? (
                  <div className="flex flex-col items-center py-8 opacity-40">
                    <HandCoins className="h-8 w-8 mb-2" />
                    <p className="text-[10px] uppercase tracking-widest text-center">Nenhum registro</p>
                  </div>
                ) : (
                  data.loans.map(loan => (
                    <div key={loan.id} className="space-y-3 p-4 rounded-2xl border border-white/5 bg-white/5 transition-all hover:bg-white/10">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-400/20 p-2 rounded-xl">
                            <Users className="h-4 w-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{loan.borrowerName}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{loan.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 items-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500 transition-colors" onClick={() => handleEditLoan(loan)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => requestDeleteLoan(loan)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-white/40">Restante</span>
                        <span className="text-green-400 font-bold">{formatCurrency(loan.remainingAmount)}</span>
                      </div>
                      {!loan.isCompleted ? (
                        <Button variant="outline" size="sm" className="w-full h-9 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => {
                          setSelectedLoan(loan);
                          setReceiveAmount(loan.expectedMonthlyAmount.toFixed(2));
                          const { display } = maskCurrency(Math.round(loan.expectedMonthlyAmount * 100).toString());
                          setDisplayReceiveAmount(display);
                          setReceiveDate(format(new Date(), 'yyyy-MM-dd'));
                          setIsReceiveLoanDialogOpen(true);
                        }}>
                          Receber Agora
                        </Button>
                      ) : (
                        <div className="w-full text-center text-xs text-green-500 font-bold bg-green-500/10 py-2 rounded-xl border border-green-500/20">Pago !</div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md rounded-[2rem]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white">Minhas Dívidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.debts.length === 0 ? (
                  <div className="flex flex-col items-center py-8 opacity-40">
                    <History className="h-8 w-8 mb-2" />
                    <p className="text-[10px] uppercase tracking-widest text-center">Nenhuma dívida</p>
                  </div>
                ) : (
                  data.debts.map(debt => (
                    <div key={debt.id} className="space-y-3 p-4 rounded-2xl border border-white/5 bg-white/5 transition-all hover:bg-white/10">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-400/20 p-2 rounded-xl">
                            <CreditCard className="h-4 w-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{debt.description}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{debt.category}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 items-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500 transition-colors" onClick={() => handleEditDebt(debt)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => requestDeleteDebt(debt)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="text-white font-bold">{Math.round(((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100)}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5 border border-white/5 p-[1px]">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-1000 shadow-lg shadow-purple-500/20" 
                            style={{ width: `${((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-white/30 truncate">Restante</span>
                          <span className="text-white/80 font-mono">{formatCurrency(debt.remainingAmount)}</span>
                        </div>
                      </div>
                      {!debt.isCompleted && (
                        <Button variant="outline" size="sm" className="w-full h-9 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => {
                          setSelectedDebt(debt);
                          setPayAmount(debt.monthlyAmount.toFixed(2));
                          const { display } = maskCurrency(Math.round(debt.monthlyAmount * 100).toString());
                          setDisplayPayAmount(display);
                          setPayDate(format(new Date(), 'yyyy-MM-dd'));
                          setIsPayDebtDialogOpen(true);
                        }}>
                          Registrar PGTO
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}

      {/* Dialogs remain similar but with dark/glass styling */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if(!open) resetTransactionForm();
      }}>
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-zinc-950 border-white/10 text-white rounded-[2rem] shadow-2xl p-5 sm:p-6 overflow-hidden">
          <DialogHeader className="shrink-0 pb-1">
            <DialogTitle className="text-xl font-bold">{editingTransactionId ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-4 py-2 font-sans custom-scrollbar">
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Onde?</Label>
              <div className="flex bg-white/5 border border-white/10 rounded-xl h-11 sm:h-12 p-1.5 relative w-full overflow-hidden">
                <button
                  type="button"
                  onClick={() => setNewPocket('cash')}
                  className={`relative z-10 flex-1 text-[10px] sm:text-[11px] font-bold transition-colors duration-300 ${newPocket === 'cash' ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Saldo Principal
                </button>
                <button
                  type="button"
                  onClick={() => setNewPocket('benefit')}
                  className={`relative z-10 flex-1 text-[10px] sm:text-[11px] font-bold transition-colors duration-300 ${newPocket === 'benefit' ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  VR / VA
                </button>
                <motion.div
                  className={`absolute top-1.5 bottom-1.5 left-1.5 rounded-lg shadow-lg ${newPocket === 'cash' ? 'bg-white' : 'bg-emerald-500'}`}
                  initial={false}
                  animate={{
                    x: newPocket === 'cash' ? '0%' : '100%',
                    width: 'calc(50% - 6px)'
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              </div>
            </div>
            {/* Benefit Member / Titular Selector */}
            {newPocket === 'benefit' && (
              <div className="grid gap-2 bg-emerald-500/5 p-3.5 rounded-2xl border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Titular do Benefício (De quem é?)
                  </Label>
                  <button 
                    type="button" 
                    onClick={() => setIsAddingNewPerson(!isAddingNewPerson)} 
                    className="text-[10px] text-emerald-400/80 hover:text-emerald-300 underline font-medium"
                  >
                    {isAddingNewPerson ? 'Selecionar existente' : '+ Outro nome'}
                  </button>
                </div>

                {isAddingNewPerson ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do titular (ex: Jorge, GO, Maria)"
                      value={customPerson}
                      onChange={(e) => {
                        setCustomPerson(e.target.value);
                        if (transactionErrors.person) setTransactionErrors(prev => ({...prev, person: false}));
                      }}
                      className={`bg-white/5 text-white rounded-xl h-10 text-xs transition-colors ${transactionErrors.person ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-emerald-500/30'}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (customPerson.trim()) {
                          setNewPerson(customPerson.trim());
                          setIsAddingNewPerson(false);
                        }
                      }}
                      className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs rounded-xl h-10 shrink-0"
                    >
                      Usar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(data.benefitMembers || ['Jorge', 'GO']).map(m => {
                      const isSelected = newPerson.toLowerCase() === m.toLowerCase();
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setNewPerson(m)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                            isSelected 
                              ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20' 
                              : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quem está lançando? (Autor) */}
            <div className="grid gap-2 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-blue-500/10 p-3.5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-widest text-pink-300 font-bold flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" /> Quem está lançando?
                </Label>
                <span className="text-[10px] text-zinc-400">
                  Destaque no extrato
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-0.5">
                {availableAuthors.map(a => {
                  const isSelected = newAuthorName.toLowerCase() === a.name.toLowerCase();
                  return (
                    <button
                      key={a.name}
                      type="button"
                      onClick={() => {
                        setNewAuthorName(a.name);
                        setNewAuthorColor(a.color);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                        isSelected
                          ? `${getAuthorBadgeStyle(a.color)} ring-2 ring-white/30 shadow-md font-extrabold`
                          : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {a.name}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 w-full mt-1">
                <Input
                  placeholder="Ou digite outro nome..."
                  value={newAuthorName}
                  onChange={(e) => setNewAuthorName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs flex-1"
                />
                <div className="flex gap-1 items-center bg-black/20 p-1 rounded-xl border border-white/5">
                  {(['blue', 'pink', 'purple', 'emerald', 'amber'] as AuthorColor[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewAuthorColor(c)}
                      className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center border cursor-pointer ${
                        newAuthorColor === c ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'
                      } ${getAuthorBadgeStyle(c)}`}
                      title={`Cor ${c}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className={`text-[10px] uppercase tracking-widest font-bold ${transactionErrors.description ? 'text-red-400' : 'text-muted-foreground'}`}>Descrição</Label>
              <Input 
                id="description" 
                placeholder={newPocket === 'benefit' ? 'Ex: Almoço Outback, Compras Mês, Recarga VR' : 'Ex: Aluguel, Salário, Mercado'} 
                value={newDescription}
                onChange={(e) => {
                  setNewDescription(e.target.value);
                  if (transactionErrors.description) setTransactionErrors(prev => ({...prev, description: false}));
                }}
                className={`bg-white/5 rounded-xl h-11 sm:h-12 text-sm transition-colors ${transactionErrors.description ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}
              />
            </div>

            {/* Estabelecimento / Local de Gasto */}
            {newPocket === 'benefit' && (
              <div className="grid gap-2">
                <Label htmlFor="location" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-400" /> Estabelecimento / Onde foi o gasto? (Opcional)
                </Label>
                <Input 
                  id="location" 
                  placeholder="Ex: Pão de Açúcar, iFood, Outback, Padaria São Bento..." 
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-11 sm:h-12 focus:ring-white/20 text-sm"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount" className={`text-[10px] uppercase tracking-widest font-bold ${transactionErrors.amount ? 'text-red-400' : 'text-muted-foreground'}`}>Valor</Label>
                <Input 
                  id="amount" 
                  placeholder="R$ 0,00" 
                  value={displayNewAmount}
                  onChange={(e) => {
                    handleCurrencyChange(e.target.value, setDisplayNewAmount, setNewAmount);
                    if (transactionErrors.amount) setTransactionErrors(prev => ({...prev, amount: false}));
                  }}
                  className={`bg-white/5 rounded-xl h-11 sm:h-12 text-sm transition-colors ${transactionErrors.amount ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Tipo</Label>
                <div className="bg-white/5 border border-white/10 rounded-xl h-11 sm:h-12 p-1.5 relative w-full overflow-hidden flex">
                  <button
                    type="button"
                    onClick={() => setNewType('income')}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-bold transition-colors duration-300 ${
                      newType === 'income' ? 'text-zinc-950' : 'text-emerald-500/60 hover:text-emerald-400'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5 hidden min-[400px]:block" />
                    <span>Ganho</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('expense')}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-bold transition-colors duration-300 ${
                      newType === 'expense' ? 'text-zinc-950' : 'text-red-500/60 hover:text-red-400'
                    }`}
                  >
                    <TrendingDown className="h-3.5 w-3.5 hidden min-[400px]:block" />
                    <span>Gasto</span>
                  </button>
                  <motion.div
                    className={`absolute top-1.5 bottom-1.5 left-1.5 rounded-lg shadow-xl shadow-black/20 ${
                      newType === 'income' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    initial={false}
                    animate={{
                      x: newType === 'income' ? '0%' : '100%',
                      width: 'calc(50% - 6px)'
                    }}
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category" className={`text-xs uppercase tracking-widest ${transactionErrors.category ? 'text-red-400 font-bold' : 'text-muted-foreground'}`}>Categoria</Label>
                {isAddingNewCategory ? (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Nova categoria" 
                      value={customCategory}
                      onChange={(e) => {
                        setCustomCategory(e.target.value);
                        if (transactionErrors.category) setTransactionErrors(prev => ({...prev, category: false}));
                      }}
                      className={`bg-white/5 rounded-xl h-12 transition-colors ${transactionErrors.category ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}
                    />
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsAddingNewCategory(false)}
                      className="h-12 w-12 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
                      title="Cancelar"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Select value={newCategory} onValueChange={(v) => {
                    if (v === 'ADD_NEW') {
                      setIsAddingNewCategory(true);
                      setNewCategory('');
                    } else {
                      setNewCategory(v);
                      if (transactionErrors.category) setTransactionErrors(prev => ({...prev, category: false}));
                    }
                  }}>
                    <SelectTrigger className={`bg-white/5 rounded-xl h-12 transition-colors ${transactionErrors.category ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl">
                      {data.categories?.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      <div className="h-px bg-white/5 my-1" />
                      <SelectItem value="ADD_NEW" className="text-emerald-400 font-bold">+ Adicionar nova</SelectItem>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsManageCategoriesOpen(true);
                        }}
                        className="flex w-full items-center px-2 py-1.5 text-xs text-muted-foreground hover:text-white hover:bg-white/5 rounded-md transition-colors"
                      >
                        <Pencil className="mr-2 h-3 w-3" /> Gerenciar categorias
                      </button>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Meio de Pagamento</Label>
                <Select value={newPaymentMethod} onValueChange={(v: any) => setNewPaymentMethod(v)}>
                  <SelectTrigger className="bg-white/5 rounded-xl h-12 border-white/10 focus:ring-white/20">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl">
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="cash">Dinheiro Espécie</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="benefit">VR / VA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newPaymentMethod === 'credit_card' ? (
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Cartão</Label>
                  <Select value={newCardId} onValueChange={setNewCardId}>
                    <SelectTrigger className="bg-purple-500/10 rounded-xl h-12 border-purple-500/30 text-purple-200">
                      <SelectValue placeholder="Selecione o Cartão" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl">
                      {data.creditCards?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                      {(!data.creditCards || data.creditCards.length === 0) && (
                        <div className="p-2 text-xs text-zinc-400">Nenhum cartão cadastrado</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="date" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Data</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="bg-white/5 border-white/10 rounded-xl h-12"
                  />
                </div>
              )}
            </div>

            {newPaymentMethod === 'credit_card' && (
              <div className="grid gap-2">
                <Label htmlFor="date_cc" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Data</Label>
                <Input 
                  id="date_cc" 
                  type="date" 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-12"
                />
              </div>
            )}

            {suggestedRecurring.length > 0 && (
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-500/70">Sugeridos (Frequentes)</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestedRecurring.slice(0, 3).map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setNewDescription(template.description);
                        setNewAmount(template.amount.toFixed(2));
                        const { display } = maskCurrency(Math.round(template.amount * 100).toString());
                        setDisplayNewAmount(display);
                        setNewType(template.type);
                        setNewCategory(template.category);
                      }}
                      className="flex-1 min-w-[140px] text-left p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-bold text-white truncate max-w-[80px]">{template.description}</p>
                        <Badge className={`text-[8px] h-3 px-1 py-0 ${template.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-400/20 text-red-400'} border-none`}>
                          {template.type === 'income' ? 'Ganho' : 'Gasto'}
                        </Badge>
                      </div>
                      <p className="text-xs font-black text-emerald-400 mt-1">{formatCurrency(template.amount)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 pt-3 border-t border-white/10 mt-1">
            <Button onClick={handleAddTransaction} className="w-full bg-white text-black hover:bg-white/90 h-11 sm:h-12 font-bold rounded-2xl text-base sm:text-lg cursor-pointer">
              {editingTransactionId ? 'Salvar Alterações' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
        <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-white/10 text-white rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Gerenciar Categorias</DialogTitle>
            <DialogDescription className="text-white/60 uppercase text-[10px] tracking-widest font-bold">Lançamentos</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {data.categories?.map(cat => (
              <div key={cat} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 group hover:bg-white/10 transition-all">
                <span className="font-medium text-sm">{cat}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => requestDeleteCategory(cat)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsManageCategoriesOpen(false)} className="w-full bg-white/5 text-white hover:bg-white/10 h-10 font-bold rounded-xl border border-white/5 mt-2">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Debt Categories Dialog */}
      <Dialog open={isManageDebtCategoriesOpen} onOpenChange={setIsManageDebtCategoriesOpen}>
        <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-white/10 text-white rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Gerenciar Categorias</DialogTitle>
            <DialogDescription className="text-white/60 uppercase text-[10px] tracking-widest font-bold">Dívidas</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {data.debtCategories?.map(cat => (
              <div key={cat} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 group hover:bg-white/10 transition-all">
                <span className="font-medium text-sm">{cat}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => requestDeleteDebtCategory(cat)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsManageDebtCategoriesOpen(false)} className="w-full bg-white/5 text-white hover:bg-white/10 h-10 font-bold rounded-xl border border-white/5 mt-2">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

          <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
            <DialogContent className="sm:max-w-[480px] max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-zinc-950 border-white/10 text-white rounded-[2rem] shadow-2xl p-5 sm:p-6 overflow-hidden">
              <DialogHeader className="shrink-0 pb-1">
                <DialogTitle className="text-xl font-bold">{editingLoanId ? 'Editar Valor a Receber' : 'Registrar Valor a Receber'}</DialogTitle>
                <DialogDescription className="text-white/60 text-xs">Controle de quem te deve dinheiro.</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-4 py-2 font-sans custom-scrollbar">
                <div className="grid gap-2">
                  <Label htmlFor="loan-borrower" className={`text-xs uppercase tracking-widest ${loanErrors.borrower ? 'text-red-400' : 'text-muted-foreground'}`}>Quem deve?</Label>
                  <Input 
                    id="loan-borrower" 
                    placeholder="Nome da pessoa" 
                    value={loanBorrower}
                    onChange={(e) => {
                      setLoanBorrower(e.target.value);
                      if (loanErrors.borrower) setLoanErrors(prev => ({...prev, borrower: false}));
                    }}
                    className={`bg-white/5 rounded-xl h-11 sm:h-12 transition-colors ${loanErrors.borrower ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="loan-desc" className={`text-xs uppercase tracking-widest ${loanErrors.description ? 'text-red-400' : 'text-muted-foreground'}`}>Descrição / Motivo</Label>
                  <Input 
                    id="loan-desc" 
                    placeholder="Ex: Empréstimo pessoal, Venda" 
                    value={loanDescription}
                    onChange={(e) => {
                      setLoanDescription(e.target.value);
                      if (loanErrors.description) setLoanErrors(prev => ({...prev, description: false}));
                    }}
                    className={`bg-white/5 rounded-xl h-11 sm:h-12 transition-colors ${loanErrors.description ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="loan-total" className={`text-xs uppercase tracking-widest ${loanErrors.total ? 'text-red-400' : 'text-muted-foreground'}`}>Valor Total</Label>
                    <Input 
                    id="loan-total" 
                    placeholder="R$ 0,00" 
                    value={displayLoanTotal}
                    onChange={(e) => {
                      handleCurrencyChange(e.target.value, setDisplayLoanTotal, setLoanTotal);
                      if (loanErrors.total) setLoanErrors(prev => ({...prev, total: false}));
                    }}
                    className={`bg-white/5 rounded-xl h-11 sm:h-12 transition-colors ${loanErrors.total ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}
                  />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="loan-inst" className="text-xs uppercase tracking-widest text-muted-foreground">Parcelas</Label>
                    <Input 
                      id="loan-inst" 
                      type="number" 
                      value={loanInstallments}
                      onChange={(e) => setLoanInstallments(e.target.value)}
                      className="bg-white/5 border-white/10 rounded-xl h-11 sm:h-12 focus:ring-white/20"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="loan-date" className="text-xs uppercase tracking-widest text-muted-foreground">Data do Empréstimo</Label>
                  <Input 
                    id="loan-date" 
                    type="date" 
                    value={loanStartDate}
                    onChange={(e) => setLoanStartDate(e.target.value)}
                    className="bg-white/5 border-white/10 rounded-xl h-11 sm:h-12 focus:ring-white/20"
                  />
                </div>
              </div>
              <DialogFooter className="shrink-0 pt-3 border-t border-white/10 mt-1">
                <Button onClick={handleAddLoan} className="w-full bg-white text-black hover:bg-white/90 h-11 sm:h-12 font-bold rounded-2xl text-base sm:text-lg">{editingLoanId ? 'Salvar Alterações' : 'Confirmar'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDebtDialogOpen} onOpenChange={setIsDebtDialogOpen}>
            <DialogContent className="sm:max-w-[480px] max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-zinc-950 border-white/10 text-white rounded-[2rem] shadow-2xl p-5 sm:p-6 overflow-hidden">
              <DialogHeader className="shrink-0 pb-1">
                <DialogTitle className="text-xl font-bold">{editingDebtId ? 'Editar Dívida' : 'Registrar Nova Dívida'}</DialogTitle>
                <DialogDescription className="text-white/60 text-xs">Dívidas de longo prazo ou parceladas.</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-4 py-2 font-sans custom-scrollbar">
                <div className="grid gap-2">
                  <Label htmlFor="debt-desc" className={`text-xs uppercase tracking-widest ${debtErrors.description ? 'text-red-400' : 'text-muted-foreground'}`}>Descrição da Dívida</Label>
                  <Input 
                    id="debt-desc" 
                    placeholder="Ex: Empréstimo, Carro, Reforma" 
                    value={debtDescription}
                    onChange={(e) => {
                      setDebtDescription(e.target.value);
                      if (debtErrors.description) setDebtErrors(prev => ({...prev, description: false}));
                    }}
                    className={`bg-white/5 rounded-xl h-11 sm:h-12 transition-colors ${debtErrors.description ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="debt-total" className={`text-xs uppercase tracking-widest ${debtErrors.total ? 'text-red-400' : 'text-muted-foreground'}`}>Valor Total</Label>
                    <Input 
                      id="debt-total" 
                      placeholder="R$ 0,00" 
                      value={displayDebtTotal}
                      onChange={(e) => {
                        handleCurrencyChange(e.target.value, setDisplayDebtTotal, setDebtTotal);
                        if (debtErrors.total) setDebtErrors(prev => ({...prev, total: false}));
                      }}
                      className={`bg-white/5 rounded-xl h-11 sm:h-12 transition-colors ${debtErrors.total ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="debt-inst" className={`text-xs uppercase tracking-widest ${debtErrors.installments ? 'text-red-400' : 'text-muted-foreground'}`}>Nº de Parcelas</Label>
                    <Input 
                      id="debt-inst" 
                      type="number" 
                      value={debtInstallments}
                      onChange={(e) => {
                        setDebtInstallments(e.target.value);
                        if (debtErrors.installments) setDebtErrors(prev => ({...prev, installments: false}));
                      }}
                      className={`bg-white/5 rounded-xl h-11 sm:h-12 transition-colors ${debtErrors.installments ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="debt-cat" className={`text-xs uppercase tracking-widest ${debtErrors.category ? 'text-red-400' : 'text-muted-foreground'}`}>Categoria</Label>
                    {isAddingNewDebtCategory ? (
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Nova categoria" 
                          value={customDebtCategory}
                          onChange={(e) => {
                            setCustomDebtCategory(e.target.value);
                            if (debtErrors.category) setDebtErrors(prev => ({...prev, category: false}));
                          }}
                          className={`bg-white/5 rounded-xl h-11 sm:h-12 transition-colors ${debtErrors.category ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}
                        />
                        <Button 
                          variant="ghost" 
                          onClick={() => setIsAddingNewDebtCategory(false)}
                          className="h-11 sm:h-12 w-12 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Select value={debtCategory} onValueChange={(v) => {
                        if (v === 'ADD_NEW') {
                          setIsAddingNewDebtCategory(true);
                          setDebtCategory('');
                        } else {
                          setDebtCategory(v);
                          if (debtErrors.category) setDebtErrors(prev => ({...prev, category: false}));
                        }
                      }}>
                        <SelectTrigger className={`bg-white/5 rounded-xl h-11 sm:h-12 transition-colors ${debtErrors.category ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'}`}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl">
                          {data.debtCategories?.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                          <div className="h-px bg-white/5 my-1" />
                          <SelectItem value="ADD_NEW" className="text-purple-400 font-bold">+ Adicionar nova</SelectItem>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsManageDebtCategoriesOpen(true);
                            }}
                            className="flex w-full items-center px-2 py-1.5 text-xs text-muted-foreground hover:text-white hover:bg-white/5 rounded-md transition-colors"
                          >
                            <Pencil className="mr-2 h-3 w-3" /> Gerenciar categorias
                          </button>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="debt-date" className="text-xs uppercase tracking-widest text-muted-foreground">Data de Início</Label>
                    <Input 
                      id="debt-date" 
                      type="date" 
                      value={debtStartDate}
                      onChange={(e) => setDebtStartDate(e.target.value)}
                      className="bg-white/5 border-white/10 rounded-xl h-11 sm:h-12 focus:ring-white/20"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    Vinculado a Cartão (Opcional)
                  </Label>
                  <Select value={debtCardId} onValueChange={setDebtCardId}>
                    <SelectTrigger className="bg-purple-500/10 rounded-xl h-11 sm:h-12 border-purple-500/30 text-purple-200">
                      <SelectValue placeholder="Sem cartão vinculado" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl">
                      <SelectItem value="none">Sem cartão vinculado</SelectItem>
                      {data.creditCards?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="shrink-0 pt-3 border-t border-white/10 mt-1">
                <Button onClick={handleAddDebt} className="w-full bg-white text-black hover:bg-white/90 h-11 sm:h-12 font-bold rounded-2xl text-base sm:text-lg">{editingDebtId ? 'Salvar Alterações' : 'Confirmar'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      <Dialog open={isPayDebtDialogOpen} onOpenChange={setIsPayDebtDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-white/10 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedDebt?.description} - Saldo: {formatCurrency(selectedDebt?.remainingAmount || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pay-amount" className="text-xs uppercase text-muted-foreground">Valor do Pagamento</Label>
              <Input 
                id="pay-amount" 
                placeholder="R$ 0,00"
                value={displayPayAmount}
                onChange={(e) => handleCurrencyChange(e.target.value, setDisplayPayAmount, setPayAmount)}
                className="bg-white/5 border-white/10 rounded-xl h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-date" className="text-xs uppercase text-muted-foreground">Data do Pagamento</Label>
              <Input 
                id="pay-date" 
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl h-11"
              />
              <p className="text-[10px] text-muted-foreground italic">O saldo restante diminuirá proporcionalmente.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handlePayDebt} className="w-full bg-white text-black hover:bg-white/90 rounded-2xl h-11 font-bold">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiveLoanDialogOpen} onOpenChange={setIsReceiveLoanDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle>Receber Valor</DialogTitle>
            <DialogDescription className="text-white/60">Quanto {selectedLoan?.borrowerName} te pagou?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="receive-amount" className="text-xs uppercase text-muted-foreground">Valor Recebido</Label>
              <Input 
                id="receive-amount" 
                placeholder="R$ 0,00" 
                value={displayReceiveAmount}
                onChange={(e) => handleCurrencyChange(e.target.value, setDisplayReceiveAmount, setReceiveAmount)}
                className="bg-white/5 border-white/10 rounded-xl h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receive-date" className="text-xs uppercase text-muted-foreground">Data do Recebimento</Label>
              <Input 
                id="receive-date" 
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleReceiveLoan} className="w-full bg-white text-black hover:bg-white/90 rounded-2xl h-11 font-bold">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        hasLocalData={data.transactions.length > 0}
        onMigrateLocalData={handleMigrateLocalData}
      />

      <CoupleSyncModal
        isOpen={isCoupleModalOpen}
        onClose={() => setIsCoupleModalOpen(false)}
        user={user}
        household={household}
        userProfile={userProfile}
        benefitMembers={data.benefitMembers || ['Jorge', 'GO']}
        transactions={data.transactions}
        initialTab={settingsTab}
        onHouseholdUpdated={(updatedHousehold) => setHousehold(updatedHousehold)}
        onProfileUpdated={(updatedProfile) => {
          setUserProfile(updatedProfile);
          if (updatedProfile.displayName) {
            setNewAuthorName(updatedProfile.displayName);
          }
          if (updatedProfile.preferredColor) {
            setNewAuthorColor(updatedProfile.preferredColor as AuthorColor);
          }
        }}
        onUpdateBenefitMembers={handleUpdateBenefitMembers}
        onRenameBenefitMember={handleRenameBenefitMember}
        onUnifyAuthorNames={handleUnifyAuthorNames}
        onExportExcel={exportToExcel}
        onExportJson={exportToJson}
        onTriggerImportJson={() => fileInputRef.current?.click()}
        onMigrateLocalData={handleMigrateLocalData}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      <ManageCardsModal
        isOpen={isManageCardsModalOpen}
        onClose={() => setIsManageCardsModalOpen(false)}
        cards={data.creditCards || []}
        debts={data.debts || []}
        transactions={data.transactions || []}
        currentMonth={currentMonth}
        onSaveCard={handleSaveCard}
        onDeleteCard={handleDeleteCard}
        availableHolders={availableAuthors.map(a => a.name)}
      />

      <ConfirmDeleteModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirmation.onConfirm}
        title={deleteConfirmation.title}
        description={deleteConfirmation.description}
        itemName={deleteConfirmation.itemName}
        itemDetail={deleteConfirmation.itemDetail}
      />

      <OfflineIndicator />
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}
