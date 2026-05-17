import { useState } from 'react';
import toast from 'react-hot-toast';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault(); // Optional chaining in case it's called programmatically
    setLoading(true);

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const res = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('receipt_token', data.access_token);
        toast.success("Welcome back!");
        onLoginSuccess();
      } else {
        toast.error("Invalid credentials.");
      }
    } catch (err) {
      toast.error("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = async () => {
    setDemoLoading(true);
    
    // Tell the backend to wipe and seed the database
    const seedPromise = fetch('http://localhost:8000/api/seed-demo', { 
      method: 'POST' 
    }).then(res => {
      if (!res.ok) throw new Error("Failed to seed");
    });

    toast.promise(seedPromise, {
      loading: 'Building demo environment...',
      success: 'Database populated!',
      error: 'Failed to build demo.',
    });

    try {
      await seedPromise;
      // Automatically trigger the login flow
      await handleLogin();
    } catch (error) {
      console.error(error);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">ReceiptAI</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in or try the interactive demo.</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          <button type="submit" disabled={loading || demoLoading} className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 transition-all shadow-sm">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">Recruiting?</span>
          </div>
        </div>

        <div className="mt-6">
          <button 
            onClick={handleDemoMode}
            disabled={loading || demoLoading} 
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all shadow-sm"
          >
            {demoLoading ? (
               'Generating Data...'
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                One-Click Demo Mode
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;