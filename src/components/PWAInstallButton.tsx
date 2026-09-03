import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'menu-item' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already installed and running in standalone mode, don't show the button
  if (isInstalled) {
    if (variant === 'menu-item') {
      return (
        <div className="px-3 py-2 text-xs flex items-center gap-2.5 text-emerald-400 font-medium bg-emerald-500/10 rounded-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Aplicativo Instalado</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (isInstallable) {
      const installed = await install();
      if (installed) {
        setJustInstalled(true);
      }
    } else {
      // If browser doesn't trigger beforeinstallprompt yet, show guide modal
      setShowIOSGuide(true);
    }
  };

  if (justInstalled) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Instalado!
      </div>
    );
  }

  // Variant: Menu Item inside Dropdown
  if (variant === 'menu-item') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full hover:bg-emerald-500/15 cursor-pointer py-2.5 px-3 rounded-xl text-xs flex items-center justify-between font-medium text-emerald-400 hover:text-emerald-300 transition-colors text-left ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Instalar Aplicativo (PWA)</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
            App
          </span>
        </button>

        {showIOSGuide && (
          <InstallInstructionsModal
            isIOS={isIOS}
            onClose={() => setShowIOSGuide(false)}
          />
        )}
      </>
    );
  }

  // Variant: Header action button
  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="Instalar aplicativo no celular ou computador"
        className={`group relative inline-flex items-center gap-2 h-11 px-3.5 sm:px-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-emerald-500/10 cursor-pointer ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <Download className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>

      {showIOSGuide && (
        <InstallInstructionsModal
          isIOS={isIOS}
          onClose={() => setShowIOSGuide(false)}
        />
      )}
    </>
  );
};

interface InstallModalProps {
  isIOS: boolean;
  onClose: () => void;
}

const InstallInstructionsModal: React.FC<InstallModalProps> = ({ isIOS, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-3xl bg-[#0d0e14] border border-white/10 p-6 shadow-2xl text-white relative space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#080a10] border border-white/10 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-emerald-500/10">
            <img src="/icon.svg" alt="FC" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Instalar Controle Financeiro</h3>
            <p className="text-xs text-zinc-400">Acesse direto da tela inicial com visual nativo</p>
          </div>
        </div>

        {isIOS ? (
          <div className="space-y-3 bg-white/[0.03] p-4 rounded-2xl border border-white/5 text-xs text-zinc-300">
            <p className="font-semibold text-white text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">iOS</span>
              Passo a passo no iPhone / iPad (Safari):
            </p>
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-2.5">
                <Share className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>1. Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra do Safari.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <PlusSquare className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>2. Role a lista e selecione <strong>Adicionar à Tela de Início</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>3. Confirme em <strong>Adicionar</strong> no canto superior direito.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-white/[0.03] p-4 rounded-2xl border border-white/5 text-xs text-zinc-300">
            <p className="font-semibold text-white text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">✓</span>
              Como instalar no Android ou Computador:
            </p>
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-2.5">
                <Download className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>1. No Chrome ou Edge, clique no ícone de <strong>Instalar</strong> na barra de endereços (ou abra o menu de 3 pontinhos).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>2. Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>3. O aplicativo abrirá em janela própria sem barra de navegador, super rápido e com ícone na sua tela!</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors shadow-lg cursor-pointer"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};
