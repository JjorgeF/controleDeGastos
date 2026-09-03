import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemName?: string;
  itemDetail?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar exclusão',
  description = 'Tem certeza que deseja excluir este item? Esta ação removerá o registro inclusive do banco de dados na nuvem e não poderá ser desfeita.',
  itemName,
  itemDetail,
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
  isLoading = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[420px] bg-[#0c0d12] border-white/10 text-white rounded-3xl p-6 shadow-2xl overflow-hidden">
        <DialogHeader className="space-y-3 items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shadow-lg shadow-red-500/10">
            <Trash2 className="w-6 h-6 animate-in zoom-in-50 duration-200" />
          </div>
          
          <div className="space-y-1">
            <DialogTitle className="text-lg font-bold text-white tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 leading-relaxed max-w-[340px] mx-auto">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {itemName && (
          <div className="my-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-left space-y-0.5">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Item a ser excluído:</p>
            <p className="text-sm font-bold text-white truncate">{itemName}</p>
            {itemDetail && (
              <p className="text-xs text-zinc-300 font-medium truncate">{itemDetail}</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>A exclusão será sincronizada com o Firebase.</span>
        </div>

        <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={onClose}
            className="w-full sm:flex-1 h-11 rounded-xl bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 font-medium transition-colors"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            disabled={isLoading}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isLoading ? 'Excluindo...' : confirmText}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
