import React, { useState } from 'react';
import { CreditCard as CreditCardType, CardColor, Debt, Transaction } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, CreditCard as CardIcon, Check, Calendar, AlertCircle, Shield, DollarSign, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export const CARD_COLORS: { id: CardColor; label: string; bgGradient: string; border: string; accent: string }[] = [
  { id: 'purple', label: 'Roxo (Nubank)', bgGradient: 'from-purple-900 via-indigo-900 to-zinc-950', border: 'border-purple-500/40', accent: 'bg-purple-500' },
  { id: 'orange', label: 'Laranja (Itaú / Inter)', bgGradient: 'from-orange-900 via-amber-900 to-zinc-950', border: 'border-orange-500/40', accent: 'bg-orange-500' },
  { id: 'black', label: 'Black / Infinite', bgGradient: 'from-zinc-900 via-zinc-950 to-black', border: 'border-white/20', accent: 'bg-zinc-400' },
  { id: 'blue', label: 'Azul (XP / Caixa)', bgGradient: 'from-blue-900 via-indigo-950 to-zinc-950', border: 'border-blue-500/40', accent: 'bg-blue-500' },
  { id: 'emerald', label: 'Verde (Sicredi / C6)', bgGradient: 'from-emerald-950 via-teal-950 to-zinc-950', border: 'border-emerald-500/40', accent: 'bg-emerald-500' },
  { id: 'amber', label: 'Dourado / Gold', bgGradient: 'from-amber-950 via-yellow-950 to-zinc-950', border: 'border-amber-500/40', accent: 'bg-amber-500' },
  { id: 'rose', label: 'Rose / Rosa', bgGradient: 'from-rose-950 via-pink-950 to-zinc-950', border: 'border-rose-500/40', accent: 'bg-rose-500' },
  { id: 'slate', label: 'Platinum / Prata', bgGradient: 'from-slate-800 via-slate-900 to-zinc-950', border: 'border-slate-400/40', accent: 'bg-slate-400' },
];

export const getCardStyle = (color?: string) => {
  const found = CARD_COLORS.find(c => c.id === color);
  if (found) return found;
  return CARD_COLORS[0];
};

interface ManageCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CreditCardType[];
  debts: Debt[];
  transactions: Transaction[];
  currentMonth: Date;
  onSaveCard: (card: CreditCardType) => void;
  onDeleteCard: (cardId: string) => void;
  availableHolders?: string[];
}

export const ManageCardsModal: React.FC<ManageCardsModalProps> = ({
  isOpen,
  onClose,
  cards,
  debts,
  transactions,
  currentMonth,
  onSaveCard,
  onDeleteCard,
  availableHolders = ['Jorge', 'GO']
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [holder, setHolder] = useState(availableHolders[0] || 'Jorge');
  const [color, setColor] = useState<CardColor>('purple');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('25');
  const [dueDay, setDueDay] = useState('5');

  const resetForm = () => {
    setName('');
    setHolder(availableHolders[0] || 'Jorge');
    setColor('purple');
    setLimit('');
    setClosingDay('25');
    setDueDay('5');
    setEditingCardId(null);
    setIsEditing(false);
  };

  const handleStartCreate = (presetName?: string, presetColor?: CardColor) => {
    setName(presetName || '');
    setColor(presetColor || 'purple');
    setHolder(availableHolders[0] || 'Jorge');
    setLimit('');
    setClosingDay('25');
    setDueDay('5');
    setEditingCardId(null);
    setIsEditing(true);
  };

  const handleStartEdit = (card: CreditCardType) => {
    setName(card.name);
    setHolder(card.holder || availableHolders[0] || 'Jorge');
    setColor((card.color as CardColor) || 'purple');
    setLimit(card.limit ? card.limit.toString() : '');
    setClosingDay(card.closingDay ? card.closingDay.toString() : '25');
    setDueDay(card.dueDay ? card.dueDay.toString() : '5');
    setEditingCardId(card.id);
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do cartão');
      return;
    }

    const parsedLimit = limit.trim() ? parseFloat(limit.replace(/\./g, '').replace(',', '.')) : undefined;
    const parsedClosing = closingDay.trim() ? parseInt(closingDay, 10) : undefined;
    const parsedDue = dueDay.trim() ? parseInt(dueDay, 10) : undefined;

    const newCard: CreditCardType = {
      id: editingCardId || `card_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      holder: holder.trim() || undefined,
      color,
      limit: isNaN(parsedLimit || 0) ? undefined : parsedLimit,
      closingDay: parsedClosing && parsedClosing >= 1 && parsedClosing <= 31 ? parsedClosing : 25,
      dueDay: parsedDue && parsedDue >= 1 && parsedDue <= 31 ? parsedDue : 5,
    };

    onSaveCard(newCard);
    toast.success(editingCardId ? 'Cartão atualizado com sucesso!' : 'Cartão cadastrado com sucesso!');
    resetForm();
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Calculate stats for each card
  const getCardStats = (card: CreditCardType) => {
    // Current month invoice from transactions
    const monthYearStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    const cardMonthTransactions = transactions.filter(t => {
      const isThisCard = t.cardId === card.id || (t.cardName && t.cardName.toLowerCase() === card.name.toLowerCase());
      const isExpense = t.type === 'expense' || t.type === 'debt_payment';
      const isThisMonth = t.date.startsWith(monthYearStr);
      return isThisCard && isExpense && isThisMonth;
    });
    const currentInvoice = cardMonthTransactions.reduce((acc, t) => acc + t.amount, 0);

    // Linked active debts
    const linkedDebts = debts.filter(d => {
      return (d.cardId === card.id || (d.cardName && d.cardName.toLowerCase() === card.name.toLowerCase())) && !d.isCompleted;
    });
    const totalDebtsRemaining = linkedDebts.reduce((acc, d) => acc + d.remainingAmount, 0);
    const totalDebtsOriginal = linkedDebts.reduce((acc, d) => acc + d.totalAmount, 0);

    // Total used limit (invoice + remaining debts)
    const totalCommitted = currentInvoice + totalDebtsRemaining;
    const limitPercentage = card.limit && card.limit > 0 ? Math.min(100, Math.round((totalCommitted / card.limit) * 100)) : null;

    return {
      currentInvoice,
      linkedDebtsCount: linkedDebts.length,
      totalDebtsRemaining,
      totalDebtsOriginal,
      totalCommitted,
      limitPercentage
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col bg-zinc-950 border-white/10 text-white rounded-[2rem] shadow-2xl p-5 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <CardIcon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-white">
                  Meus Cartões de Crédito
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Cadastre seus cartões para separar faturas, compras parceladas e dívidas
                </DialogDescription>
              </div>
            </div>
            {!isEditing && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleStartCreate()}
                className="bg-white text-zinc-950 hover:bg-white/90 font-bold text-xs rounded-xl h-9 px-3.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo Cartão
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-3 custom-scrollbar">
          {isEditing ? (
            /* Card Edit / Create Form */
            <form onSubmit={handleSubmit} className="space-y-4 bg-white/[0.02] p-4 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCardTypeIcon color={color} />
                  {editingCardId ? 'Editar Cartão' : 'Cadastrar Novo Cartão'}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  className="text-xs text-zinc-400 hover:text-white h-7 px-2"
                >
                  Cancelar
                </Button>
              </div>

              {/* Quick Presets if creating */}
              {!editingCardId && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Atalhos Rápidos</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Nubank', color: 'purple' as CardColor },
                      { name: 'Itaú', color: 'orange' as CardColor },
                      { name: 'Inter', color: 'orange' as CardColor },
                      { name: 'XP Infinite', color: 'black' as CardColor },
                      { name: 'C6 Bank', color: 'emerald' as CardColor },
                      { name: 'Bradesco', color: 'rose' as CardColor },
                    ].map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setName(preset.name);
                          setColor(preset.color);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 transition-all cursor-pointer"
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-zinc-300 font-bold">Nome do Cartão *</Label>
                  <Input
                    placeholder="Ex: Nubank, Itaú Mastercard, Inter"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-zinc-300 font-bold">Titular do Cartão</Label>
                  <Input
                    placeholder="Ex: Jorge, JF"
                    value={holder}
                    onChange={(e) => setHolder(e.target.value)}
                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-zinc-300 font-bold">Data de Fechamento</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="Ex: 25"
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-zinc-300 font-bold">Data Limite p/ Pagamento (Venc.)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="Ex: 5"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-zinc-300 font-bold">Limite de Crédito (R$ - Opcional)</Label>
                <Input
                  placeholder="Ex: 5000"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                />
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-wider text-zinc-300 font-bold">Estilo & Cor Visual</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CARD_COLORS.map(c => {
                    const isSelected = color === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setColor(c.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected ? `${c.border} ring-2 ring-white/50 bg-white/10` : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${c.accent} shrink-0`} />
                        <span className="text-xs font-semibold text-zinc-200 truncate">{c.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview Box */}
              <div className="pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1.5 block">Prévia do Cartão</Label>
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${getCardStyle(color).bgGradient} border ${getCardStyle(color).border} shadow-xl relative overflow-hidden`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-black text-white tracking-wide">{name || 'Nome do Cartão'}</p>
                      <p className="text-[10px] text-zinc-300 uppercase font-medium">{holder || 'Titular'}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-4 text-[10px] text-zinc-300">
                    <div>
                      <span className="opacity-70">Fechamento: </span>
                      <span className="font-bold text-white">Dia {closingDay || '25'}</span>
                    </div>
                    <div>
                      <span className="opacity-70">Vencimento: </span>
                      <span className="font-bold text-white">Dia {dueDay || '5'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="rounded-xl border-white/10 text-white hover:bg-white/5 text-xs h-9"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-white text-zinc-950 hover:bg-white/90 font-bold rounded-xl text-xs h-9 px-4 cursor-pointer"
                >
                  {editingCardId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </Button>
              </div>
            </form>
          ) : (
            /* Cards List */
            <div className="space-y-4">
              {cards.length === 0 ? (
                <div className="p-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
                    <CardIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Nenhum cartão cadastrado ainda</p>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                      Adicione seus cartões para lançar despesas, organizar compras parceladas e acompanhar dívidas separadamente.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleStartCreate('Nubank', 'purple')}
                      className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-xs rounded-xl font-bold"
                    >
                      + Cadastrar Nubank
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleStartCreate('Itaú', 'orange')}
                      className="bg-orange-600/30 hover:bg-orange-600/50 text-orange-200 border border-orange-500/30 text-xs rounded-xl font-bold"
                    >
                      + Cadastrar Itaú
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleStartCreate()}
                      className="bg-white text-zinc-950 hover:bg-white/90 text-xs rounded-xl font-bold"
                    >
                      + Outro Cartão
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {cards.map(card => {
                    const style = getCardStyle(card.color);
                    const stats = getCardStats(card);

                    return (
                      <div
                        key={card.id}
                        className={`p-4 rounded-2xl bg-gradient-to-br ${style.bgGradient} border ${style.border} shadow-xl relative flex flex-col justify-between group transition-all`}
                      >
                        <div>
                          {/* Header of Card */}
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-black text-white tracking-wide">{card.name}</h4>
                              </div>
                              <p className="text-[11px] text-zinc-300 font-semibold">{card.holder || 'Titular não definido'}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(card)}
                                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                                title="Editar Cartão"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja excluir o cartão "${card.name}"?`)) {
                                    onDeleteCard(card.id);
                                  }
                                }}
                                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer"
                                title="Excluir Cartão"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-2 mt-4 bg-black/30 p-2.5 rounded-xl border border-white/10">
                            <div>
                              <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Fatura Atual</p>
                              <p className="text-sm font-extrabold text-white">{formatCurrency(stats.currentInvoice)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Dívidas Vinculadas</p>
                              <p className="text-sm font-extrabold text-purple-300">
                                {stats.linkedDebtsCount > 0 ? formatCurrency(stats.totalDebtsRemaining) : 'Nenhuma'}
                              </p>
                            </div>
                          </div>

                          {/* Limit bar if available */}
                          {card.limit && card.limit > 0 && (
                            <div className="mt-2.5 space-y-1">
                              <div className="flex justify-between text-[10px] text-zinc-300">
                                <span>Comprometido: {formatCurrency(stats.totalCommitted)}</span>
                                <span className="font-bold">Limite: {formatCurrency(card.limit)}</span>
                              </div>
                              <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    (stats.limitPercentage || 0) > 85 ? 'bg-red-500' : (stats.limitPercentage || 0) > 60 ? 'bg-amber-500' : 'bg-emerald-400'
                                  }`}
                                  style={{ width: `${stats.limitPercentage || 0}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Dates Footer */}
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10 text-[10px] text-zinc-300">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-zinc-400" />
                            Fecha dia <b>{card.closingDay || 25}</b>
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-zinc-400" />
                            Vence dia <b>{card.dueDay || 5}</b>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t border-white/10">
          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl h-10 text-xs cursor-pointer"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CreditCardTypeIcon = ({ color }: { color: CardColor }) => {
  const style = getCardStyle(color);
  return (
    <span className={`w-4 h-4 rounded-md ${style.accent} flex items-center justify-center text-[8px] font-black text-black`}>
      <CardIcon className="w-2.5 h-2.5 text-white" />
    </span>
  );
};
