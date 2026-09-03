import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { 
  UtensilsCrossed, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Store, 
  PieChart as PieChartIcon, 
  Filter, 
  Plus, 
  ChevronRight,
  Sparkles,
  ShoppingBag,
  CreditCard,
  UserPlus,
  Settings2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { formatCurrency, inferPersonFromDescription } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ManageMembersModal } from './ManageMembersModal';

interface BenefitSummaryCardProps {
  transactions: Transaction[];
  members: string[];
  onOpenAddModal: (pocket: 'benefit', type?: 'income' | 'expense', person?: string) => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateMembers?: (newMembers: string[]) => void;
}

export const BenefitSummaryCard: React.FC<BenefitSummaryCardProps> = ({
  transactions,
  members,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
  onUpdateMembers
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');

  // Filter only benefit transactions
  const benefitTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'benefit_income' || t.type === 'benefit_expense');
  }, [transactions]);

  // Derive unique members from transactions + settings
  const allMembers = useMemo(() => {
    const list = [...members];
    benefitTransactions.forEach(t => {
      const p = t.person || inferPersonFromDescription(t.description, list);
      if (p && p !== 'Geral' && !list.some(m => m.toLowerCase() === p.toLowerCase())) {
        list.push(p);
      }
    });
    return list.length > 0 ? list : ['Jorge', 'GO'];
  }, [members, benefitTransactions]);

  // Calculate Combined VR stats
  const combinedStats = useMemo(() => {
    const income = benefitTransactions
      .filter(t => t.type === 'benefit_income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = benefitTransactions
      .filter(t => t.type === 'benefit_expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expense;
    return { income, expense, balance };
  }, [benefitTransactions]);

  // Calculate stats by member
  const memberStats = useMemo(() => {
    return allMembers.map(member => {
      const memberTx = benefitTransactions.filter(t => {
        const p = t.person || inferPersonFromDescription(t.description, allMembers);
        return p?.toLowerCase() === member.toLowerCase();
      });

      const income = memberTx
        .filter(t => t.type === 'benefit_income')
        .reduce((acc, t) => acc + t.amount, 0);
      const expense = memberTx
        .filter(t => t.type === 'benefit_expense')
        .reduce((acc, t) => acc + t.amount, 0);
      const balance = income - expense;

      return {
        member,
        income,
        expense,
        balance,
        count: memberTx.length
      };
    });
  }, [allMembers, benefitTransactions]);

  // Calculate expense breakdown by category & location (where the VR was spent)
  const expenseBreakdown = useMemo(() => {
    const expenses = benefitTransactions.filter(t => {
      if (t.type !== 'benefit_expense') return false;
      if (selectedPersonFilter === 'all') return true;
      const p = t.person || inferPersonFromDescription(t.description, allMembers);
      return p?.toLowerCase() === selectedPersonFilter.toLowerCase();
    });

    const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);

    // By Category
    const byCategory: Record<string, number> = {};
    // By Location / Establishment
    const byLocation: Record<string, number> = {};

    expenses.forEach(t => {
      const cat = t.category || 'Alimentação';
      byCategory[cat] = (byCategory[cat] || 0) + t.amount;

      const loc = t.location || t.description || 'Geral';
      byLocation[loc] = (byLocation[loc] || 0) + t.amount;
    });

    const categoryList = Object.entries(byCategory)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const locationList = Object.entries(byLocation)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalExpense,
      categoryList,
      locationList,
      filteredTransactions: expenses
    };
  }, [benefitTransactions, selectedPersonFilter, allMembers]);

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/15 via-teal-950/20 to-zinc-950 p-6 md:p-7 rounded-[2.5rem] border border-emerald-500/20 backdrop-blur-xl group transition-all hover:border-emerald-500/40">
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            {/* Header: Título, Badges e Ações */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  Benefícios (VR / VA do Casal)
                </span>
                <span className="text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded-full border border-emerald-500/30 whitespace-nowrap">
                  Somado & Separado
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onUpdateMembers && (
                  <button
                    onClick={() => setIsManageMembersOpen(true)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                    title="Gerenciar titulares do benefício"
                  >
                    <Users className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Titulares</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDetailsOpen(true)}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-medium"
                  title="Abrir detalhamento completo"
                >
                  <PieChartIcon className="h-3.5 w-3.5" />
                  <span>Detalhes</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Valor Somado Total */}
            <div className="mb-2">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {formatCurrency(combinedStats.balance)}
              </h2>
              <span className="text-[11px] sm:text-xs text-muted-foreground block mt-0.5">
                saldo total somado
              </span>
            </div>

            {/* Individual Breakdown Pills / Mini Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 sm:mt-5">
              {memberStats.map((st) => (
                <div 
                  key={st.member}
                  className="bg-black/35 border border-white/5 hover:border-emerald-500/30 rounded-2xl p-2.5 sm:p-3 transition-all flex flex-col justify-between overflow-hidden shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5 gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center justify-center border border-emerald-500/30 shrink-0">
                        {st.member.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-white truncate" title={st.member}>
                        {st.member}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 tabular-nums shrink-0">
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
                className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 h-9 font-medium text-xs cursor-pointer"
                onClick={() => onOpenAddModal('benefit', 'income')}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Entrada VR
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-red-500/10 border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 h-9 font-medium text-xs cursor-pointer"
                onClick={() => onOpenAddModal('benefit', 'expense')}
              >
                <TrendingDown className="h-3.5 w-3.5 mr-1" /> Gasto VR
              </Button>
            </div>

            <button
              onClick={() => setIsDetailsOpen(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer font-medium"
            >
              Onde foi gasto?
            </button>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
      </div>

      {/* Full Benefit Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-zinc-950 border-white/10 text-white rounded-[2rem] shadow-2xl p-6 font-sans">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Detalhamento dos VRs (Casal)</DialogTitle>
                <p className="text-xs text-muted-foreground">Visão somada, divisão individual e especificação de onde foi gasto</p>
              </div>
            </div>
          </DialogHeader>

          {/* Combined & Individual Cards in Modal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Total Somado</p>
              <div className="my-2">
                <span className="text-2xl font-black text-white">{formatCurrency(combinedStats.balance)}</span>
              </div>
              <div className="text-[11px] text-zinc-400 space-y-0.5">
                <div className="flex justify-between"><span>Entradas:</span> <span className="text-emerald-400 font-medium">+{formatCurrency(combinedStats.income)}</span></div>
                <div className="flex justify-between"><span>Gastos:</span> <span className="text-red-400 font-medium">-{formatCurrency(combinedStats.expense)}</span></div>
              </div>
            </div>

            {memberStats.map(st => (
              <div key={st.member} className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[10px] flex items-center justify-center">
                      {st.member.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs text-zinc-300 font-semibold truncate">VR {st.member}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400">{st.count} lançamentos</span>
                </div>
                <div className="my-2">
                  <span className="text-xl font-bold text-white">{formatCurrency(st.balance)}</span>
                </div>
                <div className="text-[11px] text-zinc-400 space-y-0.5">
                  <div className="flex justify-between"><span>Recebido:</span> <span className="text-emerald-400 font-medium">+{formatCurrency(st.income)}</span></div>
                  <div className="flex justify-between"><span>Gasto:</span> <span className="text-red-400 font-medium">-{formatCurrency(st.expense)}</span></div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar for "Onde foi gasto" */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Especificação: Onde Foi o Gasto do VR</h3>
            </div>
            
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setSelectedPersonFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                  selectedPersonFilter === 'all' 
                    ? 'bg-emerald-500 text-black font-bold' 
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                Somado (Todos)
              </button>
              {allMembers.map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedPersonFilter(m)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                    selectedPersonFilter.toLowerCase() === m.toLowerCase()
                      ? 'bg-emerald-500 text-black font-bold' 
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Categories & Establishments Breakdown */}
          {expenseBreakdown.totalExpense === 0 ? (
            <div className="text-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/10 text-muted-foreground">
              <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40 text-emerald-400" />
              <p className="text-sm font-medium">Nenhum gasto de VR registrado ainda {selectedPersonFilter !== 'all' ? `para ${selectedPersonFilter}` : ''}.</p>
              <p className="text-xs mt-1">Ao lançar um gasto de VR, você pode indicar o estabelecimento e a categoria.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl"
                onClick={() => {
                  setIsDetailsOpen(false);
                  onOpenAddModal('benefit', 'expense', selectedPersonFilter !== 'all' ? selectedPersonFilter : undefined);
                }}
              >
                + Registrar Gasto de VR
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Category Breakdown Progress Bars */}
              <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Gastos por Categoria</h4>
                <div className="space-y-2.5">
                  {expenseBreakdown.categoryList.map(item => (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-zinc-200">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[11px]">{item.percentage.toFixed(0)}%</span>
                          <span className="font-bold text-white">{formatCurrency(item.amount)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, item.percentage)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions list of VR expenses */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Histórico de Gastos com VR</h4>
                  <span className="text-xs text-muted-foreground">{expenseBreakdown.filteredTransactions.length} registros</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {expenseBreakdown.filteredTransactions.map(t => {
                    const person = t.person || inferPersonFromDescription(t.description, allMembers) || 'Geral';
                    return (
                      <div 
                        key={t.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-bold">
                            <UtensilsCrossed className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white text-sm">{t.description}</p>
                              <span className="bg-emerald-500/15 text-emerald-300 font-semibold px-2 py-0.5 rounded-md text-[10px] border border-emerald-500/20">
                                {person}
                              </span>
                              {t.location && (
                                <span className="bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                                  <Store className="h-2.5 w-2.5" /> {t.location}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground text-[11px] mt-0.5">
                              <span>{format(parseISO(t.date), 'dd/MM/yyyy')}</span>
                              <span>•</span>
                              <span>{t.category}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-red-400 text-sm">
                            - {formatCurrency(t.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-white"
                            onClick={() => {
                              setIsDetailsOpen(false);
                              onEditTransaction(t);
                            }}
                          >
                            Editar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
              onClick={() => setIsDetailsOpen(false)}
            >
              Fechar
            </Button>
            <div className="flex gap-2">
              <Button
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl"
                onClick={() => {
                  setIsDetailsOpen(false);
                  onOpenAddModal('benefit', 'expense', selectedPersonFilter !== 'all' ? selectedPersonFilter : undefined);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Novo Gasto de VR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Members Modal */}
      {onUpdateMembers && (
        <ManageMembersModal
          isOpen={isManageMembersOpen}
          onClose={() => setIsManageMembersOpen(false)}
          members={allMembers}
          onSaveMembers={(newM) => {
            onUpdateMembers(newM);
          }}
        />
      )}
    </>
  );
};
