import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles,
  HeartHandshake
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';



export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage('Login efetuado com sucesso! Redirecionando...');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Verifique seu e-mail para confirmar o cadastro!');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    if (!email) {
      setError('Por favor, insira seu e-mail para a recuperação de senha.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.href}/reset-password`,
      });
      if (error) throw error;
      
      await supabase.auth.signOut();
      setMessage('E-mail de recuperação enviado com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Falha ao solicitar recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-cyan-50 via-teal-50/50 to-blue-50 p-4 relative overflow-hidden font-sans">
      {/* Elementos Decorativos de Fundo Remetendo a Odontologia/Água/Purity */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 rounded-full bg-teal-200/20 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-cyan-200/30 blur-3xl pointer-events-none"></div>

      {/* Card Principal */}
      <div className="w-full max-w-md bg-white/85 backdrop-blur-md rounded-2xl shadow-xl border border-teal-100/60 p-8 relative z-10 transition-all duration-300 hover:shadow-2xl hover:border-teal-200/80">
        
        {/* Logo Icon Odonto / 3D */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl shadow-lg shadow-teal-500/20 mb-4 animate-bounce-slow">
            {/* SVG customizado de um dente estilizado com brilho high-tech */}
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-1.2 0-2.4 1.2-3 3C8 8.4 7 11 7 14c0 3.5 2.5 5 5 5s5-1.5 5-5c0-3-1-5.6-2-8-.6-1.8-1.8-3-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19c-1.5 0-2.5 1-3.5 2-.5.5-1.2.5-1.5 0-.5-.7-.5-2 0-3M12 19c1.5 0 2.5 1 3.5 2 .5.5 1.2.5 1.5 0 .5-.7.5-2 0-3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent tracking-tight">
            CRM
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 font-medium flex items-center justify-center gap-1.5">
            {isLogin ? (
              <>
                <ShieldCheck className="w-4 h-4 text-teal-500" />
                Acesso ao Painel 
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-500" />
                Crie sua conta clínica
              </>
            )}
          </p>
        </div>

        {/* Notificações e feedbacks visuais integrados */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-start gap-2 animate-shake">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {message && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium flex items-start gap-2 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
            <p className="leading-relaxed">{message}</p>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-500  tracking-wider mb-1.5">
              E-mail profissional
            </label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition-colors">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white transition-all duration-200"
                placeholder="dentista@consultorio.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-500  tracking-wider mb-1.5">
              Senha de acesso
            </label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition-colors">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white transition-all duration-200"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botão de Ação */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 relative overflow-hidden bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-teal-500/15 hover:shadow-xl hover:shadow-teal-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <>
                <span className="tracking-wide">{isLogin ? 'Entrar no Sistema' : 'Cadastrar Conta'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Links Adicionais / Alternar Fluxo */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            className="text-sm text-teal-600 hover:text-teal-700 font-semibold transition-colors duration-200 focus:outline-none"
          >
            {isLogin ? 'Não tem uma conta? Solicitar cadastro' : 'Já tem uma credencial? Fazer login'}
          </button>
          
          {isLogin && (
            <button
              onClick={handleRecovery}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors duration-200 focus:outline-none"
            >
              Esqueceu sua senha de acesso?
            </button>
          )}
        </div>

        {/* Rodapé Clínico */}
        <div className="mt-6 text-center">
          <p className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
            Sistema 100% desenvolvido por <a href="https://portifoliojeanldev.online" target='_blank' className='underline'>Jean Lucas</a>
          </p>
        </div>

      </div>

      {/* CSS extra para suportar as animações suaves e customizadas */}
      <style>{`
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-slow {
          animation: bounceSlow 3s ease-in-out infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 2;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}