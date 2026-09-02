import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Heart, 
  Mail, 
  UserCheck, 
  ShieldCheck,
  Palette,
  UserPlus,
  CreditCard,
  Plus,
  Trash2,
  Check,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  FileJson,
  Upload,
  Cloud,
  LogOut,
  LogIn,
  Sliders,
  CheckCircle2,
  Pencil,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Household, 
  HouseholdMember, 
  UserProfile, 
  AuthorColor,
  Transaction 
} from '../types';
import { 
  invitePartnerByEmail,
  updateUserMemberProfile
} from '../lib/firestoreService';
import { FirebaseUser, auth, firebaseSignOut } from '../lib/firebase';

export type SettingsTab = 'profile' | 'benefits' | 'couple' | 'backup';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  household: Household | null;
  userProfile: UserProfile | null;
  benefitMembers?: string[];
  transactions?: Transaction[];
  initialTab?: SettingsTab;
  onHouseholdUpdated?: (household: Household) => void;
  onProfileUpdated: (profile: UserProfile) => void;
  onUpdateBenefitMembers?: (newMembers: string[]) => void;
  onRenameBenefitMember?: (oldName: string, newName: string) => Promise<void> | void;
  onUnifyAuthorNames?: (oldName: string, newName: string, newColor?: AuthorColor) => Promise<void>;
  onExportExcel?: () => void;
  onExportJson?: () => void;
  onTriggerImportJson?: () => void;
  onMigrateLocalData?: () => void;
  onOpenAuth?: () => void;
}

export const COLOR_CONFIG: Record<AuthorColor, { label: string; bg: string; text: string; border: string; dot: string; ring: string }> = {
  blue: {
    label: 'Azul',
    bg: 'bg-blue-500/15',
    text: 'text-blue-300',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
    ring: 'focus:ring-blue-500'
  },
  pink: {
    label: 'Rosa',
    bg: 'bg-pink-500/15',
    text: 'text-pink-300',
    border: 'border-pink-500/30',
    dot: 'bg-pink-400',
    ring: 'focus:ring-pink-500'
  },
  emerald: {
    label: 'Verde',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    ring: 'focus:ring-emerald-500'
  },
  purple: {
    label: 'Roxo',
    bg: 'bg-purple-500/15',
    text: 'text-purple-300',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400',
    ring: 'focus:ring-purple-500'
  },
  amber: {
    label: 'Âmbar',
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    ring: 'focus:ring-amber-500'
  }
};

export function CoupleSyncModal({
  isOpen,
  onClose,
  user,
  household,
  userProfile,
  benefitMembers = ['Jorge', 'GO'],
  transactions = [],
  initialTab = 'profile',
  onHouseholdUpdated,
  onProfileUpdated,
  onUpdateBenefitMembers,
  onRenameBenefitMember,
  onUnifyAuthorNames,
  onExportExcel,
  onExportJson,
  onTriggerImportJson,
  onMigrateLocalData,
  onOpenAuth
}: SettingsModalProps) {
  const [partnerEmail, setPartnerEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Member editing state
  const [editingMyName, setEditingMyName] = useState(userProfile?.displayName || user?.displayName || 'Jorge');
  const [selectedColor, setSelectedColor] = useState<AuthorColor>((userProfile?.preferredColor as AuthorColor) || 'blue');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUnifying, setIsUnifying] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Benefit members editing state
  const [localBenefitMembers, setLocalBenefitMembers] = useState<string[]>(benefitMembers);
  const [newBenefitName, setNewBenefitName] = useState('');
  const [editingBenefitIndex, setEditingBenefitIndex] = useState<number | null>(null);
  const [editingBenefitName, setEditingBenefitName] = useState('');

  // Keep state synchronized when modal opens or profile changes
  useEffect(() => {
    if (isOpen) {
      setEditingMyName(userProfile?.displayName || user?.displayName || 'Jorge');
      setSelectedColor((userProfile?.preferredColor as AuthorColor) || 'blue');
      setLocalBenefitMembers(benefitMembers);
      setActiveTab(initialTab);
      setEditingBenefitIndex(null);
      setEditingBenefitName('');
    }
  }, [isOpen, userProfile, user, benefitMembers, initialTab]);

  // Detect previous authors in transactions that differ from current user's name
  const currentNameTrimmed = (editingMyName || '').trim();
  const legacyAuthors = React.useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const authorCounts = new Map<string, number>();
    transactions.forEach(t => {
      const a = (t.createdByName || 'Jorge').trim();
      authorCounts.set(a, (authorCounts.get(a) || 0) + 1);
    });

    const result: { name: string; count: number }[] = [];
    authorCounts.forEach((count, name) => {
      if (name.toLowerCase() !== currentNameTrimmed.toLowerCase()) {
        result.push({ name, count });
      }
    });
    return result;
  }, [transactions, currentNameTrimmed]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await firebaseSignOut(auth);
      toast.success('Desconectado com sucesso!');
      onClose();
    } catch (e: any) {
      toast.error('Erro ao sair da conta: ' + e.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleInviteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household || !partnerEmail.trim()) {
      toast.error('Informe o e-mail do(a) companheiro(a)');
      return;
    }

    setIsInviting(true);
    try {
      await invitePartnerByEmail(household.id, partnerEmail.trim());
      toast.success(`Convite registrado para ${partnerEmail.trim()}! Quando fizer login com essa conta Google, as contas estarão sincronizadas.`);
      setPartnerEmail('');
      if (onHouseholdUpdated) {
        onHouseholdUpdated({
          ...household,
          memberEmails: Array.from(new Set([...household.memberEmails, partnerEmail.trim().toLowerCase()]))
        });
      }
    } catch (e: any) {
      toast.error('Erro ao enviar convite: ' + e.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleSaveMemberProfile = async () => {
    const finalName = editingMyName.trim() || user?.displayName || 'Jorge';
    setIsSavingProfile(true);
    try {
      if (user) {
        await updateUserMemberProfile(household?.id || userProfile?.householdId || user.uid, user.uid, {
          name: finalName,
          color: selectedColor
        });
      }
      const updatedProfile: UserProfile = {
        ...(userProfile || {
          uid: user?.uid || 'anonymous',
          email: user?.email || '',
          householdId: household?.id || user?.uid || 'default',
          updatedAt: new Date().toISOString()
        }),
        displayName: finalName,
        preferredColor: selectedColor
      };
      onProfileUpdated(updatedProfile);
      toast.success('Identificação atualizada com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao salvar preferências: ' + e.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUnifyLegacyAuthor = async (oldName: string) => {
    if (!onUnifyAuthorNames) return;
    const targetName = editingMyName.trim() || userProfile?.displayName || user?.displayName || 'Jorge';
    setIsUnifying(true);
    try {
      if (user) {
        await updateUserMemberProfile(household?.id || userProfile?.householdId || user.uid, user.uid, {
          name: targetName,
          color: selectedColor
        });
      }
      if (userProfile) {
        onProfileUpdated({
          ...userProfile,
          displayName: targetName,
          preferredColor: selectedColor
        });
      }
      await onUnifyAuthorNames(oldName, targetName, selectedColor);
    } catch (e: any) {
      toast.error('Erro ao unificar lançamentos: ' + e.message);
    } finally {
      setIsUnifying(false);
    }
  };

  const handleSaveBenefitMembers = (updated: string[]) => {
    setLocalBenefitMembers(updated);
    if (onUpdateBenefitMembers) {
      onUpdateBenefitMembers(updated);
    }
  };

  const handleAddBenefitMember = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBenefitName.trim();
    if (!name) return;
    if (localBenefitMembers.includes(name)) {
      toast.error('Este titular já está na lista');
      return;
    }
    const updated = [...localBenefitMembers, name];
    handleSaveBenefitMembers(updated);
    setNewBenefitName('');
    toast.success(`Titular "${name}" adicionado aos benefícios!`);
  };

  const handleRemoveBenefitMember = (indexToRemove: number) => {
    if (localBenefitMembers.length <= 1) {
      toast.error('Mantenha pelo menos um titular de benefícios.');
      return;
    }
    const removedName = localBenefitMembers[indexToRemove];
    const updated = localBenefitMembers.filter((_, i) => i !== indexToRemove);
    handleSaveBenefitMembers(updated);
    if (editingBenefitIndex === indexToRemove) {
      setEditingBenefitIndex(null);
      setEditingBenefitName('');
    }
    toast.success(`Titular "${removedName}" removido.`);
  };

  const handleStartEditBenefit = (index: number, currentName: string) => {
    setEditingBenefitIndex(index);
    setEditingBenefitName(currentName);
  };

  const handleCancelEditBenefit = () => {
    setEditingBenefitIndex(null);
    setEditingBenefitName('');
  };

  const handleSaveEditBenefit = async (index: number) => {
    const oldName = localBenefitMembers[index];
    const newName = editingBenefitName.trim();
    if (!newName) {
      toast.error('O nome do titular não pode ficar vazio.');
      return;
    }
    if (newName.toLowerCase() !== oldName.toLowerCase() && localBenefitMembers.some((m, i) => i !== index && m.toLowerCase() === newName.toLowerCase())) {
      toast.error('Já existe um titular com esse nome na lista.');
      return;
    }
    if (newName === oldName) {
      setEditingBenefitIndex(null);
      setEditingBenefitName('');
      return;
    }

    const updated = localBenefitMembers.map((m, i) => i === index ? newName : m);
    setLocalBenefitMembers(updated);
    if (onRenameBenefitMember) {
      await onRenameBenefitMember(oldName, newName);
    } else if (onUpdateBenefitMembers) {
      onUpdateBenefitMembers(updated);
    }
    setEditingBenefitIndex(null);
    setEditingBenefitName('');
  };

  const membersList: HouseholdMember[] = household?.memberProfiles 
    ? Object.values(household.memberProfiles) 
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0c0d12] border-white/10 text-white w-[95vw] max-w-2xl sm:max-w-3xl backdrop-blur-2xl p-6 sm:p-8 rounded-[2rem] font-sans max-h-[88vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="space-y-3 pb-2 border-b border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center text-indigo-400 shadow-inner">
                <Sliders className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white tracking-tight">
                  Configurações & Perfil
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                  Gerencie seus dados de exibição, titulares de benefício, casal e backups.
                </DialogDescription>
              </div>
            </div>

            {user ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full text-xs self-start sm:self-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-300 font-medium">{user.displayName || user.email?.split('@')[0]}</span>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  if (onOpenAuth) onOpenAuth();
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl h-8 px-3.5"
              >
                <LogIn className="w-3.5 h-3.5 mr-1.5" />
                Entrar com Google
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Spacious, Unobstructed Tab Navigation */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-zinc-900/80 border border-white/10 rounded-2xl shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`min-h-[44px] sm:min-h-[48px] px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 text-center cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-zinc-950 shadow-md font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Meu Perfil</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('benefits')}
            className={`min-h-[44px] sm:min-h-[48px] px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 text-center cursor-pointer ${
              activeTab === 'benefits'
                ? 'bg-white text-zinc-950 shadow-md font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span className="truncate">Titulares VR / VA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('couple')}
            className={`min-h-[44px] sm:min-h-[48px] px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 text-center cursor-pointer ${
              activeTab === 'couple'
                ? 'bg-white text-zinc-950 shadow-md font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className="w-4 h-4 text-pink-400 shrink-0" />
            <span className="truncate">Espaço Casal</span>
            {household && household.members.length > 1 && (
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`min-h-[44px] sm:min-h-[48px] px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 text-center cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-white text-zinc-950 shadow-md font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span className="truncate">Dados & Backup</span>
          </button>
        </div>

        {/* Tab 1: Profile & Authors */}
        {activeTab === 'profile' && (
          <div className="space-y-6 pt-3">
            {/* Active User Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-lg">
                    {editingMyName ? editingMyName.charAt(0).toUpperCase() : 'J'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {editingMyName || 'Jorge'}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {COLOR_CONFIG[selectedColor]?.label || 'Azul'}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {user ? user.email : 'Sessão Local'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 grid gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2 block">
                    Nome exibido nos seus lançamentos:
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input 
                      value={editingMyName} 
                      onChange={(e) => setEditingMyName(e.target.value)}
                      placeholder="Ex: Jorge ou Jorge Felipe"
                      className="bg-black/40 border-white/10 rounded-xl h-11 text-sm flex-1 font-medium focus:ring-white/20"
                    />
                    <div className="flex gap-2 shrink-0">
                      {user?.displayName && user.displayName !== editingMyName && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingMyName(user.displayName || '')}
                          className="text-xs h-11 px-3.5 border-white/10 text-zinc-300 hover:text-white bg-white/5"
                        >
                          Usar "{user.displayName}"
                        </Button>
                      )}
                      {editingMyName !== 'Jorge' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingMyName('Jorge')}
                          className="text-xs h-11 px-3.5 border-white/10 text-zinc-300 hover:text-white bg-white/5"
                        >
                          Usar "Jorge"
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2.5 block">
                    Cor da sua tag nos lançamentos:
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {(Object.keys(COLOR_CONFIG) as AuthorColor[]).map((c) => {
                      const cfg = COLOR_CONFIG[c];
                      const isSelected = selectedColor === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColor(c)}
                          className={`p-3 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isSelected
                              ? `${cfg.bg} ${cfg.border} ring-2 ring-white/50 shadow-lg font-bold scale-[1.02]`
                              : 'bg-white/5 border-white/5 hover:bg-white/10 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full ${cfg.dot}`} />
                          <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSaveMemberProfile}
                  disabled={isSavingProfile}
                  className="w-full bg-white text-zinc-950 hover:bg-white/90 font-bold h-11 rounded-xl text-sm mt-2 shadow-lg cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isSavingProfile ? 'Salvando...' : 'Salvar Alterações de Perfil'}
                </Button>
              </div>
            </div>

            {/* Unify Legacy Authors Section */}
            {legacyAuthors.length > 0 && onUnifyAuthorNames && (
              <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">
                      Padronizar Lançamentos Anteriores
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      Encontramos lançamentos gravados com nomes diferentes (ex: "{legacyAuthors.map(l => l.name).join(', ')}"). Clique no botão abaixo para atualizar todos para <strong>"{editingMyName.trim() || 'Jorge'}"</strong> e manter seu extrato unificado.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {legacyAuthors.map((la) => (
                    <div 
                      key={la.name}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-black/50 border border-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-white">"{la.name}"</span>
                        <span className="text-xs text-zinc-400 bg-white/10 px-2 py-0.5 rounded-md">
                          {la.count} lançamento(s)
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        disabled={isUnifying}
                        onClick={() => handleUnifyLegacyAuthor(la.name)}
                        className="h-9 px-4 rounded-xl bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mudar para "{editingMyName.trim() || 'Jorge'}"</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Benefits VR / VA */}
        {activeTab === 'benefits' && (
          <div className="space-y-6 pt-3">
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-blue-500/10 border border-indigo-500/20 space-y-4">
              <div className="flex items-center gap-3 text-indigo-400">
                <div className="p-2 bg-indigo-500/20 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Titulares dos Cartões de Benefício (VR / VA)
                  </h3>
                  <p className="text-xs text-indigo-200/70 mt-0.5">
                    Defina quem possui cartões para divisão do saldo acumulado.
                  </p>
                </div>
              </div>

              {/* Members list for Benefits */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {localBenefitMembers.map((member, idx) => {
                  const isEditing = editingBenefitIndex === idx;
                  const txCount = transactions.filter(t => (t.type === 'benefit_income' || t.type === 'benefit_expense') && (t.person?.toLowerCase() === member.toLowerCase() || t.description.toLowerCase().includes(member.toLowerCase()))).length;

                  if (isEditing) {
                    return (
                      <div 
                        key={idx}
                        className="flex items-center gap-2 p-3 rounded-2xl bg-black/80 border border-indigo-500/50 shadow-lg"
                      >
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                          {editingBenefitName ? editingBenefitName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <Input 
                          value={editingBenefitName}
                          onChange={(e) => setEditingBenefitName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEditBenefit(idx);
                            } else if (e.key === 'Escape') {
                              handleCancelEditBenefit();
                            }
                          }}
                          autoFocus
                          placeholder="Nome do titular"
                          className="bg-black/90 border-white/20 rounded-xl h-9 text-sm flex-1 font-semibold focus:ring-indigo-500 text-white"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveEditBenefit(idx)}
                          className="h-9 px-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shrink-0 cursor-pointer"
                          title="Salvar alteração"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Salvar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEditBenefit}
                          className="h-9 w-9 p-0 text-zinc-400 hover:text-white rounded-xl cursor-pointer shrink-0"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-black/50 border border-white/10 hover:border-white/20 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                          {member.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-white block truncate">VR - {member}</span>
                          <span className="text-[11px] text-zinc-400 block truncate">
                            {txCount > 0 ? `${txCount} lançamento(s)` : 'Saldo individualizado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEditBenefit(idx, member)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-xl cursor-pointer"
                          title="Editar nome do titular"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBenefitMember(idx)}
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer"
                          title="Remover titular"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Benefit Member */}
              <form onSubmit={handleAddBenefitMember} className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Input 
                  value={newBenefitName}
                  onChange={(e) => setNewBenefitName(e.target.value)}
                  placeholder="Nome do titular (ex: Gabi, Felipe, Empresa...)"
                  className="bg-black/60 border-white/10 rounded-xl h-11 text-sm flex-1 focus:ring-indigo-500/30"
                />
                <Button
                  type="submit"
                  disabled={!newBenefitName.trim()}
                  className="bg-indigo-500 text-white hover:bg-indigo-400 font-bold text-sm h-11 px-5 rounded-xl shrink-0 cursor-pointer shadow-lg shadow-indigo-500/20"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Adicionar Titular
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Couple Space */}
        {activeTab === 'couple' && (
          <div className="space-y-6 pt-3">
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-rose-500/10 border border-pink-500/20 space-y-4">
              <div className="flex items-center gap-3 text-pink-400">
                <div className="p-2.5 bg-pink-500/20 rounded-2xl border border-pink-500/30">
                  <Heart className="w-6 h-6 fill-pink-500/30" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Compartilhamento com a Companheira
                  </h3>
                  <p className="text-xs text-pink-200/70 mt-0.5">
                    Mantenham as finanças e extratos sincronizados no mesmo espaço em tempo real.
                  </p>
                </div>
              </div>

              {/* Connected Members List */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold block">
                  Membros com Acesso:
                </Label>
                <div className="grid gap-2.5">
                  {membersList.length > 0 ? (
                    membersList.map((m) => {
                      const colorStyle = COLOR_CONFIG[m.color as AuthorColor] || COLOR_CONFIG.blue;
                      const isMe = m.uid === user?.uid;
                      return (
                        <div 
                          key={m.uid} 
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${colorStyle.bg} ${colorStyle.border} ${colorStyle.text}`}>
                              {m.photoURL ? (
                                <img src={m.photoURL} alt={m.name} className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                m.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-white">{m.name}</span>
                                {isMe && (
                                  <span className="text-[10px] bg-white/10 text-zinc-300 px-2 py-0.5 rounded font-medium">
                                    Você
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-400">{m.email || 'Conta sincronizada'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-emerald-400 font-semibold">Conectado</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-sm">
                          {editingMyName ? editingMyName.charAt(0).toUpperCase() : 'J'}
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-white">{editingMyName || 'Jorge'} (Você)</span>
                          <p className="text-xs text-zinc-400">{user?.email || 'Acesso individual'}</p>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400 bg-white/5 px-2.5 py-1 rounded-lg">Principal</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Invite Partner Form */}
              <form onSubmit={handleInviteEmail} className="pt-3 border-t border-white/10 space-y-3">
                <Label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold block">
                  Convidar por E-mail Google:
                </Label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <Input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="email.da.companheira@gmail.com"
                    className="bg-black/60 border-white/10 rounded-xl h-11 text-sm flex-1 focus:ring-pink-500/30"
                  />
                  <Button
                    type="submit"
                    disabled={isInviting || !partnerEmail}
                    className="bg-pink-500 text-white hover:bg-pink-400 font-bold h-11 px-5 rounded-xl text-sm shrink-0 cursor-pointer shadow-lg shadow-pink-500/20"
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    {isInviting ? 'Convidando...' : 'Liberar Acesso'}
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Assim que ela fizer login usando esse e-mail Google, todas as transações, dívidas e saldos aparecerão para vocês dois em tempo real.
                </p>
              </form>
            </div>
          </div>
        )}

        {/* Tab 4: Backup & Data */}
        {activeTab === 'backup' && (
          <div className="space-y-6 pt-3">
            <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Exportação e Cópias de Segurança
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Exporte relatórios em planilha ou salve um arquivo com todos os dados.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5 pt-1">
                {onExportExcel && (
                  <button
                    type="button"
                    onClick={onExportExcel}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-left flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">Planilha Excel (.xlsx)</span>
                      <span className="text-xs text-zinc-400">Exportar relatório formatado</span>
                    </div>
                  </button>
                )}

                {onExportJson && (
                  <button
                    type="button"
                    onClick={onExportJson}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-left flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">Backup Completo (.json)</span>
                      <span className="text-xs text-zinc-400">Exportar cópia de restauração</span>
                    </div>
                  </button>
                )}

                {onTriggerImportJson && (
                  <button
                    type="button"
                    onClick={onTriggerImportJson}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all text-left flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">Restaurar Backup</span>
                      <span className="text-xs text-zinc-400">Importar arquivo .json</span>
                    </div>
                  </button>
                )}

                {user && onMigrateLocalData && (
                  <button
                    type="button"
                    onClick={onMigrateLocalData}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-left flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">Sincronizar Nuvem</span>
                      <span className="text-xs text-zinc-400">Forçar envio ao Firebase</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Sincronização Nuvem Google Firestore
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-zinc-300 hover:text-white cursor-pointer px-4 h-9 rounded-xl"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
