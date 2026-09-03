import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: string[];
  onSaveMembers: (updatedMembers: string[]) => void;
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
  isOpen,
  onClose,
  members,
  onSaveMembers
}) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<{ index: number; name: string } | null>(null);

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newMemberName.trim();
    if (!trimmed) {
      setError('Informe um nome válido');
      return;
    }

    if (members.some(m => m.toLowerCase() === trimmed.toLowerCase())) {
      setError(`O titular "${trimmed}" já está cadastrado.`);
      return;
    }

    const updated = [...members, trimmed];
    onSaveMembers(updated);
    setNewMemberName('');
    setError(null);
  };

  const handleRemove = (indexToRemove: number) => {
    if (members.length <= 1) {
      setError('É necessário manter ao menos 1 titular do benefício.');
      return;
    }
    const updated = members.filter((_, idx) => idx !== indexToRemove);
    onSaveMembers(updated);
    setError(null);
  };

  const startEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingValue(currentName);
    setError(null);
  };

  const saveEdit = (index: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setError('O nome não pode ficar vazio.');
      return;
    }

    const existsOther = members.some((m, idx) => idx !== index && m.toLowerCase() === trimmed.toLowerCase());
    if (existsOther) {
      setError(`Já existe outro titular com o nome "${trimmed}".`);
      return;
    }

    const updated = members.map((m, idx) => idx === index ? trimmed : m);
    onSaveMembers(updated);
    setEditingIndex(null);
    setEditingValue('');
    setError(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[450px] bg-zinc-950 border-white/10 text-white rounded-[2rem] shadow-2xl p-6 font-sans">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Titulares do Benefício (VR/VA)</DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Adicione, renomeie ou remova os membros que possuem cartões de VR/VA.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl text-xs flex items-center gap-2 mt-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Add new member input */}
        <form onSubmit={handleAdd} className="mt-4 flex gap-2">
          <Input
            placeholder="Nome do titular (ex: Jorge, GO, Maria...)"
            value={newMemberName}
            onChange={(e) => {
              setNewMemberName(e.target.value);
              if (error) setError(null);
            }}
            className="bg-white/5 border-emerald-500/30 text-white rounded-xl h-11 text-xs focus:border-emerald-400 focus:ring-emerald-400/20"
          />
          <Button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-11 px-4 rounded-xl text-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </form>

        {/* Members List */}
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
          <Label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
            Titulares Atuais ({members.length})
          </Label>
          
          {members.map((member, index) => {
            const isEditing = editingIndex === index;

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="bg-black/50 border-emerald-500/40 text-white rounded-lg h-8 text-xs flex-1"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/20 rounded-lg"
                      onClick={() => saveEdit(index)}
                      title="Salvar alteração"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-zinc-400 hover:bg-white/10 rounded-lg"
                      onClick={cancelEdit}
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                        {member.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-white">{member}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                        onClick={() => startEdit(index, member)}
                        title="Renomear titular"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-30 cursor-pointer"
                        onClick={() => setMemberToDelete({ index, name: member })}
                        disabled={members.length <= 1}
                        title={members.length <= 1 ? "Mínimo 1 titular obrigatório" : "Remover titular"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-3 border-t border-white/10 flex justify-end">
          <Button
            variant="outline"
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl text-xs h-10 px-5"
            onClick={onClose}
          >
            Concluir
          </Button>
        </div>
      </DialogContent>

      <ConfirmDeleteModal
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={() => {
          if (memberToDelete) {
            handleRemove(memberToDelete.index);
            setMemberToDelete(null);
          }
        }}
        title="Remover Titular?"
        description="Tem certeza que deseja remover este titular de benefícios?"
        itemName={memberToDelete?.name}
      />
    </Dialog>
  );
};
