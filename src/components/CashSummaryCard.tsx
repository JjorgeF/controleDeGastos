import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ChevronRight, 
  PieChart as PieChartIcon, 
  Users,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, inferPersonFromDescription } from '../lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CashSummaryCardProps {
  transactions: Transaction[];
  members: string[];
  availableAuthors?: { name: string; color?: string }[];
  onOpenAddModal: (pocket: 'cash', type?: 'income' | 'expense', authorName?: string) => void;
  onViewTransactions: (authorFilter?: string) => void;
}

export const CashSummaryCard: React.FC<CashSummaryCardProps> = ({
  transactions,
  members,
  availableAuthors = [],
  onOpenAddModal,
  onViewTransactions,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');

  // Fallback members
  const allMembers = useMemo(() => {
    if (members && members.length > 0) return members;
    if (availableAuthors && availableAuthors.length > 0) {
      return availableAuthors.map(a => a.name);
    }
    return ['JF', 'GO'];
  }, [members, availableAuthors]);

  // Cash transactions: all that are NOT benefit pocket/type
  const cashTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.pocket !== 'benefit' && 
      t.type !== 'benefit_income' && 
      t.type !== 'benefit_expense'
    );
  }, [transactions]);

  // Helper to accurately identify which member a cash transaction belongs to
  const getMemberForTransaction = (t: Transaction): string => {
    const norm = (s?: string) => (s || '').trim().toLowerCase();

    // 1. Direct match on person field
    if (t.person) {
      const matched = allMembers.find(m => norm(m) === norm(t.person));
      if (matched) return matched;
    }

    // 2. Direct match on createdByName field
    if (t.createdByName) {
      const matched = allMembers.find(m => norm(m) === norm(t.createdByName));
      if (matched) return matched;

      // Handle common aliases: 'Jorge' <-> 'JF'
      const nameLower = norm(t.createdByName);
      if (nameLower === 'jorge' || nameLower === 'jf') {
        const jfMember = allMembers.find(m => norm(m) === 'jf' || norm(m) === 'jorge');
        if (jfMember) return jfMember;
      }
    }

    // 3. Infer from transaction description (e.g. "JF Mercado", "GO - Almoço")
    const inferred = inferPersonFromDescription(t.description, allMembers);
    if (inferred) {
      const matched = allMembers.find(m => norm(m) === norm(inferred));
      if (matched) return matched;
    }

    // 4. Default: first member (primary account holder)
    return allMembers[0] || 'JF';
  };

  // Combined stats
  const combinedStats = useMemo(() => {
    const income = cashTransactions
      .filter(t => t.type === 'income' || t.type === 'loan_received')
      .reduce((acc, t) => acc + t.amount, 0);

    const expense = cashTransactions
      .filter(t => t.type === 'expense' || t.type === 'debt_payment')
      .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expense;
    return { income, expense, balance };
  }, [cashTransactions]);

  // Member stats
  const memberStats = useMemo(() => {
    return allMembers.map(member => {
      const memberTx = cashTransactions.filter(t => getMemberForTransaction(t) === member);

      const income = memberTx
        .filter(t => t.type === 'income' || t.type === 'loan_received')
        .reduce((acc, t) => acc + t.amount, 0);

      const expense = memberTx
        .filter(t => t.type === 'expense' || t.type === 'debt_payment')
        .reduce((acc, t) => acc + t.amount, 0);

      const balance = income - expense;

      // Find member color if available
      const authorInfo = availableAuthors.find(
        a => a.name.toLowerCase() === member.toLowerCase()
      );

      return {
        member,
        income,
        expense,
        balance,
        count: memberTx.length,
        color: authorInfo?.color || 'indigo'
      };
    });
  }, [allMembers, cashTransactions, availableAuthors]);

  // Expense breakdown by category for the modal
  const expenseBreakdown = useMemo(() => {
    const expenses = cashTransactions.filter(t => {
      if (t.type !== 'expense' && t.type !== 'debt_payment') return false;
      if (selectedMemberFilter === 'all') return true;
      return getMemberForTransaction(t).toLowerCase() === selectedMemberFilter.toLowerCase();
    });

    const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);
    const byCategory: Record<string, number> = {};

    expenses.forEach(t => {
      const cat = t.category || 'Geral';
      byCategory[cat] = (byCategory[cat] || 0) + t.amount;
    });

    return {
      totalExpense,
      categories: Object.entries(byCategory)
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
    };
  }, [cashTransactions, selectedMemberFilter]);

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-emerald-500/5 p-6 md:p-7 rounded-[2.5rem] border border-white/10 backdrop-blur-xl group transition-all hover:border-white/20">
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-indigo-400">
                    Conta Corrente
                  </span>
                  <span className="text-[9px] sm:text-[10px] bg-indigo-500/20 text-indigo-300 font-medium px-2 py-0.5 rounded-full border border-indigo-500/30 whitespace-nowrap">
                    Dinheiro
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2.5">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                    {formatCurrency(combinedStats.balance)}
                  </h2>
                  <span className="text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap">
                    saldo total acumulado
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <button
                  onClick={() => setIsDetailsOpen(true)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 hover:text-white p-2 sm:px-2.5 sm:py-2 rounded-xl sm:rounded-2xl transition-all cursor-pointer flex items-center gap-1 text-xs font-medium"
                  title="Abrir detalhamento de saldo e gastos"
                >
                  <PieChartIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Detalhes</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Individual Breakdown Pills / Mini Cards (Replicado de Benefícios) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 sm:mt-5">
              {memberStats.map((st) => (
                <div 
                  key={st.member}
                  onClick={() => onViewTransactions(st.member)}
                  className="bg-black/35 border border-white/5 hover:border-indigo-500/40 rounded-2xl p-2.5 sm:p-3 transition-all flex flex-col justify-between overflow-hidden shadow-sm cursor-pointer group/card"
                  title={`Ver lançamentos de ${st.member}`}
                >
                  <div className="flex items-center justify-between mb-1.5 gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center justify-center border border-emerald-500/30 shrink-0 group-hover/card:border-emerald-400 group-hover/card:bg-emerald-500/30 transition-colors">
                        {st.member.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-white truncate" title={st.member}>
                        {st.member}
                      </span>
                    </div>
                    <span className={`text-xs font-bold tabular-nums shrink-0 ${st.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(st.balance)}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-white/5 space-y-0.5 text-[10.5px]">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-zinc-400 text-[10px] shrink-0">Rec:</span>
                      <span className="font-semibold text-zinc-200 tabular-nums truncate text-right">
                        +{formatCurrency(st.income)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-zinc-400 text-[10px] shrink-0">Gasto:</span>
                      <span className="font-semibold text-red-400 tabular-nums truncate text-right">
                        -{formatCurrency(st.expense)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-2 items-center justify-between pt-4 border-t border-white/5">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-indigo-500/10 border-indigo-500/20 text-indigo-300 rounded-xl hover:bg-indigo-500/20 h-9 font-medium text-xs cursor-pointer"
                onClick={() => onOpenAddModal('cash', 'income')}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Entrada
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-red-500/10 border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 h-9 font-medium text-xs cursor-pointer"
                onClick={() => onOpenAddModal('cash', 'expense')}
              >
                <TrendingDown className="h-3.5 w-3.5 mr-1" /> Gasto
              </Button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-black hover:bg-white/90 rounded-xl h-9 px-4 font-bold text-xs shadow-lg shadow-white/5 cursor-pointer"
              onClick={() => onViewTransactions()}
            >
              Extrato
            </Button>
          </div>
        </div>

        {/* Decorative background glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:opacity-20 transition-all rotate-12 pointer-events-none">
          <Wallet size={160} className="text-white" />
        </div>
      </div>

      {/* Modal de Detalhamento de Saldo em Dinheiro */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[540px] bg-[#0c0d12] border-white/10 text-white rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="space-y-1.5 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Detalhamento de Conta Corrente (Dinheiro)
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Visão individual e somada das receitas e gastos em dinheiro
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto space-y-4 pr-1 custom-scrollbar flex-1">
            {/* Cards de Membros no Modal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {memberStats.map(st => (
                <div
                  key={st.member}
                  className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                        {st.member.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm text-white">{st.member}</span>
                    </div>
                    <span className={`font-bold text-sm ${st.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(st.balance)}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span className="flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" /> Recebido:
                      </span>
                      <strong className="text-emerald-400">+{formatCurrency(st.income)}</strong>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span className="flex items-center gap-1">
                        <ArrowDownRight className="w-3 h-3 text-red-400" /> Gasto:
                      </span>
                      <strong className="text-red-400">-{formatCurrency(st.expense)}</strong>
                    </div>
                    <div className="flex justify-between items-center text-zinc-500 text-[11px] pt-1">
                      <span>Lançamentos:</span>
                      <span>{st.count}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs bg-white/5 border-white/10 text-zinc-300 hover:text-white rounded-xl"
                    onClick={() => {
                      setIsDetailsOpen(false);
                      onViewTransactions(st.member);
                    }}
                  >
                    Ver Extrato de {st.member}
                  </Button>
                </div>
              ))}
            </div>

            {/* Total Somado */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Saldo Total Acumulado</p>
                <p className="text-xl font-extrabold text-white">{formatCurrency(combinedStats.balance)}</p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <p className="text-zinc-400">Receitas: <strong className="text-emerald-400">+{formatCurrency(combinedStats.income)}</strong></p>
                <p className="text-zinc-400">Gastos: <strong className="text-red-400">-{formatCurrency(combinedStats.expense)}</strong></p>
              </div>
            </div>

            {/* Categorias mais gastas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Gastos por Categoria
                </span>
                {allMembers.length > 1 && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSelectedMemberFilter('all')}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                        selectedMemberFilter === 'all'
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-bold'
                          : 'bg-white/5 text-zinc-400 border-white/5 hover:text-white'
                      }`}
                    >
                      Todos
                    </button>
                    {allMembers.map(m => (
                      <button
                        key={m}
                        onClick={() => setSelectedMemberFilter(m)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                          selectedMemberFilter === m
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-bold'
                            : 'bg-white/5 text-zinc-400 border-white/5 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {expenseBreakdown.categories.length === 0 ? (
                <p className="text-xs text-zinc-500 py-3 text-center">Nenhum gasto registrado nesta seleção.</p>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {expenseBreakdown.categories.slice(0, 5).map(cat => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300 font-medium">{cat.name}</span>
                        <span className="text-zinc-200 font-bold">{formatCurrency(cat.amount)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
