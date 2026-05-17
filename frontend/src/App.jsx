import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import ReceiptCard from './components/ReceiptCard';
import AnalyticsTab from './components/AnalyticsTab';
import Login from './components/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [history, setHistory] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("receipts");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check local storage or system preference on load
    const savedTheme = localStorage.getItem('receipt_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);
  
  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('receipt_token');
    if (token) setIsAuthenticated(true);
  }, []);

  // Only fetch data if we are authenticated
  useEffect(() => { 
    if (isAuthenticated) {
      setPage(0);
      setHasMore(true);
      fetchHistory(0, true, searchTerm);
    }
  }, [searchTerm, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) fetchAnalytics();
  }, [isAuthenticated]);

  // Helper function to get the token for our fetch calls
  const getHeaders = () => {
    const token = localStorage.getItem('receipt_token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('receipt_theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('receipt_theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const fetchHistory = async (pageToFetch = 0, isReset = false, currentSearch = searchTerm) => {
    if (!isReset) setIsLoadingMore(true);
    try {
      const limit = 10;
      const skip = pageToFetch * limit;
      let url = `http://localhost:8000/api/receipts?skip=${skip}&limit=${limit}`;
      if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
        
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const newData = await res.json();
        if (newData.length < limit) setHasMore(false);
        else setHasMore(true);

        if (isReset) setHistory(newData);
        else setHistory(prev => [...prev, ...newData]);
      } else if (res.status === 401) {
        handleLogout(); // Kick them out if token expired
      }
    } catch (err) { 
      toast.error("Failed to fetch receipt history."); 
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage, false, searchTerm);
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/analytics', { headers: getHeaders() });
      if (res.ok) setAnalyticsData(await res.json());
    } catch (err) { 
      console.error("Analytics fetch failed", err); 
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setCurrentReceipt(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadPromise = fetch('http://localhost:8000/api/extract', { 
      method: 'POST', 
      headers: getHeaders(),
      body: formData 
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to process image');
        return res.json();
      });

    toast.promise(uploadPromise, {
      loading: 'Digitizing receipt with AI...',
      success: 'Data extracted successfully!',
      error: 'Failed to extract data.',
    });

    try {
      const data = await uploadPromise;
      setCurrentReceipt(data);
      setPage(0);
      setHasMore(true);
      fetchHistory(0, true, searchTerm);
      fetchAnalytics();
      setActiveTab("receipts");
    } catch (err) {} finally { 
      setLoading(false); 
      setFile(null);
    }
  };

  const handleDataRefresh = (action, payload) => {
    if (currentReceipt) {
        if (action === 'delete' && currentReceipt.id === payload) setCurrentReceipt(null);
        else if (action === 'update' && currentReceipt.id === payload.id) setCurrentReceipt(payload);
    }
    setPage(0);
    setHasMore(true);
    fetchHistory(0, true, searchTerm);
    fetchAnalytics();
  };

  const handleLogout = () => {
    localStorage.removeItem('receipt_token');
    setIsAuthenticated(false);
    setHistory([]);
    setAnalyticsData(null);
    setCurrentReceipt(null);
  };

  // If not logged in, show the Login screen!
  if (!isAuthenticated) {
    return (
      <>
        <Toaster 
          position="bottom-right" 
          toastOptions={{ 
            style: { 
              borderRadius: '10px', 
              background: isDarkMode ? '#1e293b' : '#333', 
              color: '#fff', 
              fontSize: '14px',
              border: isDarkMode ? '1px solid #334155' : 'none'
            }
          }} 
        />
        <Login 
          onLoginSuccess={() => setIsAuthenticated(true)}
          isDarkMode={isDarkMode} 
          toggleTheme={toggleTheme} 
        />
      </>
    );
  }

  // --- Normal Dashboard Render Below ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Updated Toaster for Dark Mode support */}
      <Toaster 
        position="bottom-right" 
        toastOptions={{ 
          style: { 
            borderRadius: '10px', 
            background: isDarkMode ? '#1e293b' : '#333', 
            color: '#fff', 
            fontSize: '14px',
            border: isDarkMode ? '1px solid #334155' : 'none'
          }, 
          success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } }, 
          error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } } 
        }} 
      />

      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 transition-colors duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">ReceiptAI</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <button onClick={handleLogout} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 sticky top-24 transition-colors duration-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              Upload Receipt
            </h2>
            <div className="relative group cursor-pointer">
              <div className={`absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed rounded-xl transition-colors ${file ? 'border-indigo-400 dark:border-indigo-500' : 'border-indigo-200 dark:border-indigo-800/60 group-hover:border-indigo-400 dark:group-hover:border-indigo-500'}`}></div>
              <div className="relative p-8 flex flex-col items-center justify-center text-center">
                <svg className={`w-10 h-10 mb-3 transition-colors ${file ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-300 dark:text-indigo-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{file ? file.name : "Click to select an image"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">JPG, PNG, or HEIC</p>
                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>
            <button onClick={handleUpload} disabled={!file || loading} className={`mt-6 w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-white transition-all ${!file || loading ? 'bg-slate-300 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 hover:shadow-lg hover:-translate-y-0.5'}`}>
              {loading ? 'Digitizing...' : 'Extract Data'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <button onClick={() => setActiveTab("receipts")} className={`pb-4 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "receipts" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              My Receipts
            </button>
            <button onClick={() => setActiveTab("analytics")} className={`pb-4 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "analytics" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              Analytics
            </button>
          </div>

          {activeTab === "analytics" ? (
            <AnalyticsTab analyticsData={analyticsData} />
          ) : (
            <div className="space-y-8">
              {currentReceipt && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4">Latest Scan</h2>
                  <ReceiptCard receipt={currentReceipt} isNew={true} onRefresh={handleDataRefresh} />
                </section>
              )}
              
              {history.length > 0 ? (
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Receipt History</h2>
                    </div>
                    
                    <div className="relative w-full sm:w-72">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                      </div>
                      <input type="text" placeholder="Search stores, items, or dates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {history.filter(rec => !currentReceipt || rec.id !== currentReceipt.id).map((receipt) => (
                      <ReceiptCard key={receipt.id} receipt={receipt} isNew={false} onRefresh={handleDataRefresh} />
                    ))}
                  </div>
                  
                  {hasMore && history.length > 0 && (
                    <div className="mt-8 flex justify-center">
                      <button 
                        onClick={handleLoadMore} 
                        disabled={isLoadingMore}
                        className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingMore ? 'Loading...' : 'Load More Receipts'}
                      </button>
                    </div>
                  )}
                </section>
              ) : (
                !currentReceipt && (
                  <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 animate-in fade-in duration-500 transition-colors">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="h-8 w-8 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">No receipts yet</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Upload your first receipt using the panel on the left to start tracking your expenses.</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;