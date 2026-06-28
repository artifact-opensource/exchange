import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/authContext';
import { Hexagon, Lock } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('investor@example.com');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    login();
    setTimeout(() => {
      navigate('/investor/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
             <Hexagon className="h-12 w-12 text-teal-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">Investor Portal</h2>
          <p className="mt-2 text-zinc-400">Secure access for shareholders</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="••••••••••••"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-zinc-400">
                <input type="checkbox" className="mr-2 rounded border-zinc-700 bg-zinc-800 text-teal-500 focus:ring-offset-zinc-900" />
                Remember me
              </label>
              <a href="#" className="text-teal-500 hover:text-teal-400">Forgot password?</a>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-sm font-medium text-zinc-900 bg-white hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500">
              Protected by military-grade encryption. Unauthorized access is prohibited.
            </p>
          </div>
        </div>
        
        <div className="text-center mt-6">
           <button onClick={() => navigate('/')} className="text-sm text-zinc-500 hover:text-white transition-colors">
             &larr; Back to Public Site
           </button>
        </div>
      </div>
    </div>
  );
};
