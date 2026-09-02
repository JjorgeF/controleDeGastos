import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  firebaseSignOut,
  FirebaseUser 
} from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { LogIn, LogOut, User, Cloud, Check, ShieldCheck, Heart, Users } from 'lucide-react';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  onMigrateLocalData?: () => void;
  hasLocalData?: boolean;
}

export function UserAuthButton({ 
  user, 
  onOpenAuth, 
  isSyncing,
  hasLocalData,
  onMigrateLocalData,
  onOpenCoupleModal,
  isCoupleConnected
}: { 
  user: FirebaseUser | null; 
  onOpenAuth: () => void;
  isSyncing: boolean;
  hasLocalData?: boolean;
  onMigrateLocalData?: () => void;
  onOpenCoupleModal?: () => void;
  isCoupleConnected?: boolean;
}) {
  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      toast.success('Desconectado com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao sair: ' + e.message);
    }
  };

  if (!user) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={onOpenAuth}
        className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl h-10 px-3.5 text-xs font-semibold flex items-center gap-2"
      >
        <LogIn className="h-4 w-4" />
        <span>Entrar / Sincronizar</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 h-10 text-xs text-white transition-all cursor-pointer outline-none">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full object-cover border border-white/20" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="text-left hidden sm:block max-w-[110px] truncate">
          <p className="font-medium text-xs truncate">{user.displayName || user.email?.split('@')[0]}</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span>{isCoupleConnected ? 'Casal Sincronizado' : (isSyncing ? 'Sincronizando' : 'Firebase Nuvem')}</span>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-zinc-900 border-white/10 text-white rounded-xl shadow-2xl p-2 font-sans">
        <DropdownMenuLabel className="font-normal px-2 py-1.5">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold text-white leading-none">{user.displayName || 'Usuário'}</p>
            <p className="text-xs text-zinc-400 truncate leading-none">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5" />

        {onOpenCoupleModal && (
          <>
            <DropdownMenuItem 
              onClick={onOpenCoupleModal} 
              className="text-xs text-pink-300 hover:bg-pink-500/10 cursor-pointer py-2 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Heart className="h-3.5 w-3.5 fill-pink-500/30 text-pink-400" />
                <span>Espaço do Casal</span>
              </div>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded font-bold">
                {isCoupleConnected ? 'Conectado' : 'Configurar'}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
          </>
        )}
        
        {hasLocalData && onMigrateLocalData && (
          <>
            <DropdownMenuItem 
              onClick={onMigrateLocalData} 
              className="text-xs text-amber-400 hover:bg-amber-500/10 cursor-pointer py-2 rounded-lg flex items-center gap-2"
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>Enviar dados locais para Nuvem</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
          </>
        )}

        <div className="px-2 py-2 text-[11px] text-zinc-400 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Sincronização em tempo real Firestore</span>
        </div>

        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem 
          onClick={handleLogout} 
          className="text-xs text-red-400 hover:bg-red-500/10 cursor-pointer py-2 rounded-lg flex items-center gap-2"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sair da conta</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AuthModal({ isOpen, onClose, user, onMigrateLocalData, hasLocalData }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha email e senha');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Conta criada com sucesso e sincronizada no Firebase!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Conectado com sucesso!');
      }
      onClose();
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Email ou senha inválidos.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este email já está cadastrado. Tente entrar.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'A senha deve ter pelo menos 6 caracteres.';
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Conectado via Google com sucesso!');
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error('Erro ao autenticar com Google: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-950/95 border-white/10 text-white sm:max-w-[420px] backdrop-blur-2xl p-6 rounded-3xl font-sans">
        <DialogHeader className="space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1">
            <Cloud className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {isRegister ? 'Criar Conta na Nuvem' : 'Entrar na sua Conta'}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Salve seus lançamentos no Firebase Firestore para acessar de qualquer celular, computador ou na Vercel com isolamento total de dados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleEmailAuth} className="space-y-4 my-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Email</Label>
            <Input 
              type="email" 
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/5 border-white/10 rounded-xl h-11 text-sm"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Senha</Label>
            <Input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border-white/10 rounded-xl h-11 text-sm"
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-bold h-11 rounded-xl shadow-lg shadow-emerald-500/10 transition-all text-xs uppercase tracking-wider"
          >
            {loading ? 'Processando...' : (isRegister ? 'Criar Conta' : 'Entrar')}
          </Button>
        </form>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-zinc-950 px-2 text-zinc-500 font-semibold tracking-widest">Ou continue com</span>
          </div>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 font-semibold h-11 rounded-xl text-xs gap-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Google
        </Button>

        <div className="mt-4 text-center">
          <button 
            type="button" 
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            {isRegister ? 'Já possui uma conta? Faça login' : 'Não tem uma conta ainda? Cadastre-se'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
