import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, Loader2 } from 'lucide-react';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // O App.jsx vai detectar o login automaticamente e mudar a tela
      
    } catch (error) {
      alert("Erro ao entrar: Verifique e-mail e senha.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vitum-light flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg border border-vitum-border">
        
        {/* Logo / Cabeçalho */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-vitum-primary text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">
            V
          </div>
          <h1 className="text-2xl font-bold text-vitum-dark">Acesse o Vitum</h1>
          <p className="text-gray-500 mt-2">Sistema de Gestão de Fisioterapia</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-6">
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seunome@clinica.com"
                className="w-full pl-10 p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none transition-all"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-vitum-primary text-white py-3 rounded-lg font-bold hover:bg-[#08905E] transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar no Sistema'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          Vitum v1.0 • Protegido por criptografia segura
        </p>
      </div>
    </div>
  );
};

export default Login;