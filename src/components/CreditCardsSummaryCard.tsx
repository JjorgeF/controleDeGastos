import React from 'react';
import { CreditCard, Debt, Transaction } from '../types';
import { Button } from '@/components/ui/button';
import { CreditCard as CardIcon, Plus, ChevronRight, Sparkles, Layers, DollarSign } from 'lucide-react';
import { getCardStyle } from './ManageCardsModal';

interface CreditCardsSummaryCardProps {
  cards: CreditCard[];
  debts: Debt[];
  transactions: Transaction[];
  currentMonth: Date;
  onOpenManageCards: () => void;
  onOpenAddTransactionForCard?: (cardId: string) => void;
  onOpenAddDebtForCard?: (cardId: string) => void;
}

export const CreditCardsSummaryCard: React.FC<CreditCardsSummaryCardProps> = ({
  cards,
  debts,
  transactions,
  currentMonth,
  onOpenManageCards,
  onOpenAddTransactionForCard,
  onOpenAddDebtForCard,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const monthYearStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

  // Calculate global summary across cards
  const totalInvoices = transactions.reduce((acc, t) => {
    if (t.cardId && (t.type === 'expense' || t.type === 'debt_payment') && t.date.startsWith(monthYearStr)) {
      return acc + t.amount;
    }
    return acc;
  }, 0);

  const totalCardDebtsRemaining = debts.reduce((acc, d) => {
    if (d.cardId && !d.isCompleted) {
      return acc + d.remainingAmount;
    }
    return acc;
  }, 0);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-purple-950/40 via-zinc-900/60 to-zinc-950 p-6 md:p-8 rounded-[2.5rem] border border-purple-500/20 backdrop-blur-xl group transition-all hover:border-purple-500/40">
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <CardIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-purple-300 uppercase tracking-widest">
                  Cartões de Crédito
                </h3>
                <span className="text-[10px] text-zinc-400">
                  {cards.length} {cards.length === 1 ? 'cartão ativo' : 'cartões ativos'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenManageCards}
              className="bg-white/5 hover:bg-white/10 text-zinc-200 border-white/10 rounded-xl text-xs h-8 px-3 cursor-pointer"
            >
              Gerenciar
              <ChevronRight className="w-3.5 h-3.5 ml-1 opacity-70" />
            </Button>
          </div>

          {/* Big Total Invoices Display */}
          <div className="my-3">
            <p className="text-[10px] sm:text-xs text-zinc-400 font-medium">Faturas Previstas no Mês</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {formatCurrency(totalInvoices)}
            </h2>
            {totalCardDebtsRemaining > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-purple-300/90 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                  + {formatCurrency(totalCardDebtsRemaining)} em dívidas/parcelamentos futuros
                </span>
              </div>
            )}
          </div>

          {/* Cards Mini Grid */}
          {cards.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2 mt-4">
              <p className="text-xs text-zinc-400">Nenhum cartão cadastrado.</p>
              <Button
                type="button"
                size="sm"
                onClick={onOpenManageCards}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl h-8 px-4"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Cadastrar Cartão (Nubank, Itaú...)
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
              {cards.slice(0, 4).map(card => {
                const style = getCardStyle(card.color);
                const cardMonthExpenses = transactions.reduce((acc, t) => {
                  const isThisCard = t.cardId === card.id || (t.cardName && t.cardName.toLowerCase() === card.name.toLowerCase());
                  if (isThisCard && (t.type === 'expense' || t.type === 'debt_payment') && t.date.startsWith(monthYearStr)) {
                    return acc + t.amount;
                  }
                  return acc;
                }, 0);

                const cardDebts = debts.filter(d => (d.cardId === card.id || (d.cardName && d.cardName.toLowerCase() === card.name.toLowerCase())) && !d.isCompleted);
                const cardDebtsTotal = cardDebts.reduce((acc, d) => acc + d.remainingAmount, 0);

                return (
                  <div
                    key={card.id}
                    className={`p-3 rounded-2xl bg-gradient-to-br ${style.bgGradient} border ${style.border} shadow-lg relative overflow-hidden`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-white tracking-wide truncate max-w-[120px]">{card.name}</p>
                        </div>
                        <p className="text-[10px] text-zinc-300 font-medium">{card.holder || 'Titular'}</p>
                      </div>
                      <span className="text-[9px] text-zinc-300 bg-black/40 px-1.5 py-0.5 rounded-md border border-white/10">
                        Vence dia {card.dueDay || 5}
                      </span>
                    </div>

                    <div className="mt-2.5 flex justify-between items-end">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-zinc-300 font-bold opacity-75">Fatura Mês</p>
                        <p className="text-xs font-black text-white">{formatCurrency(cardMonthExpenses)}</p>
                      </div>
                      {cardDebtsTotal > 0 && (
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-wider text-purple-300 font-bold opacity-75">Dívidas</p>
                          <p className="text-[11px] font-bold text-purple-200">{formatCurrency(cardDebtsTotal)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap gap-2.5 mt-6">
          <Button
            type="button"
            onClick={onOpenManageCards}
            className="bg-white text-zinc-950 hover:bg-white/90 rounded-2xl px-5 h-10 font-bold text-xs shadow-lg shadow-white/5 cursor-pointer"
          >
            Ver Todos os Cartões
          </Button>
          {cards.length > 0 && onOpenAddTransactionForCard && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenAddTransactionForCard(cards[0].id)}
              className="bg-white/5 border-white/10 text-white rounded-2xl px-4 h-10 hover:bg-white/10 text-xs"
            >
              + Lançar no Cartão
            </Button>
          )}
        </div>
      </div>

      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-purple-500/20 transition-all" />
      <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:opacity-20 transition-all rotate-12">
        <CardIcon size={160} className="text-white" />
      </div>
    </div>
  );
};
