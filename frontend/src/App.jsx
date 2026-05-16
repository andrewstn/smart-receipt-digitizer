import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast'; // <-- NEW: Import the Toaster
import ReceiptCard from './components/ReceiptCard';
import AnalyticsTab from './components/AnalyticsTab';

function App() {
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

  useEffect(() => { 
    setPage(0);
    setHasMore(true);
    fetchHistory(0, true, searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchHistory = async (pageToFetch = 0, isReset = false, currentSearch = searchTerm) => {
    if (!isReset) setIsLoadingMore(true);
    try {
      const limit = 10;
      const skip = pageToFetch * limit;
      let url = `http://localhost:8000/api/receipts?skip=${skip}&limit=${limit}`;
      if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
        
      const res = await fetch(url);
      if (res.ok) {
        const newData = await res.json();
        if (newData.length < limit) setHasMore(false);
        else setHasMore(true);

        if (isReset) setHistory(newData);
        else setHistory(prev => [...prev, ...newData]);
      }
    } catch (err) { 
      toast.error("Failed to fetch receipt history."); // <-- NEW
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
      const res = await fetch('http://localhost:8000/api/analytics');
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
    
    // NEW: Wrap the upload in a toast promise!
    const uploadPromise = fetch('http://localhost:8000/api/extract', { method: 'POST', body: formData })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to process image');
        return res.json();
      });

    toast.promise(uploadPromise, {
      loading: 'Digitizing receipt with AI...',
      success: 'Data extracted successfully!',
      error: 'Failed to extract data. Is the backend running?',
    });

    try {
      const data = await uploadPromise;
      setCurrentReceipt(data);
      setPage(0);
      setHasMore(true);
      fetchHistory(0, true, searchTerm);
      fetchAnalytics();
      setActiveTab("receipts");
    } catch (err) { 
      // Error handled by toast.promise automatically
    } finally { 
      setLoading(false); 
      setFile(null); // Clear the file input after successful upload
    }
  };

  const handleDataRefresh = (action, payload) => {
    if (currentReceipt) {
        if (action === 'delete' && currentReceipt.id === payload) {
            setCurrentReceipt(null);
        } else if (action === 'update' && currentReceipt.id === payload.id) {
            setCurrentReceipt(payload);
        }
    }
    setPage(0);
    setHasMore(true);
    fetchHistory(0, true, searchTerm);
    fetchAnalytics();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* NEW: The Toaster Component. This controls where and how toasts appear globally */}
      <Toaster 
        position="bottom-right" 
        toastOptions={{ 
          style: { borderRadius: '10px', background: '#333', color: '#fff', fontSize: '14px' },
          success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }} 
      />

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">ReceiptAI</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              Upload Receipt
            </h2>
            <div className="relative group cursor-pointer">
              <div className={`absolute inset-0 bg-indigo-50 border-2 border-dashed rounded-xl transition-colors ${file ? 'border-indigo-400' : 'border-indigo-200 group-hover:border-indigo-400'}`}></div>
              <div className="relative p-8 flex flex-col items-center justify-center text-center">
                <svg className={`w-10 h-10 mb-3 transition-colors ${file ? 'text-indigo-600' : 'text-indigo-300 group-hover:text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <p className="text-sm font-medium text-slate-700 mb-1">{file ? file.name : "Click to select an image"}</p>
                <p className="text-xs text-slate-500">JPG, PNG, or HEIC</p>
                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>
            <button onClick={handleUpload} disabled={!file || loading} className={`mt-6 w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-white transition-all ${!file || loading ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5'}`}>
              {loading ? 'Digitizing...' : 'Extract Data'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex border-b border-slate-200">
            <button onClick={() => setActiveTab("receipts")} className={`pb-4 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "receipts" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              My Receipts
            </button>
            <button onClick={() => setActiveTab("analytics")} className={`pb-4 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "analytics" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
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
                  <h2 className="text-xl font-extrabold text-slate-900 mb-4">Latest Scan</h2>
                  <ReceiptCard receipt={currentReceipt} isNew={true} onRefresh={handleDataRefresh} />
                </section>
              )}
              
              {history.length > 0 ? (
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-extrabold text-slate-900">Receipt History</h2>
                    </div>
                    
                    <div className="relative w-full sm:w-72">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                      </div>
                      <input type="text" placeholder="Search stores, items, or dates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {history.filter(rec => !currentReceipt || rec.id !== currentReceipt.id).map((receipt) => (
                      <ReceiptCard key={receipt.id} receipt={receipt} isNew={false} onRefresh={handleDataRefresh} />
                    ))}

                    {history.length === 0 && searchTerm && (
                      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <h3 className="mt-2 text-sm font-medium text-slate-900">No matching receipts</h3>
                        <p className="mt-1 text-sm text-slate-500">We couldn't find anything matching "{searchTerm}".</p>
                      </div>
                    )}
                  </div>
                  
                  {hasMore && history.length > 0 && (
                    <div className="mt-8 flex justify-center">
                      <button 
                        onClick={handleLoadMore} 
                        disabled={isLoadingMore}
                        className="px-6 py-2.5 bg-white border border-slate-300 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingMore ? 'Loading...' : 'Load More Receipts'}
                      </button>
                    </div>
                  )}
                  
                  {!hasMore && history.length > 0 && (
                    <div className="mt-8 text-center text-sm text-slate-400">
                      You've reached the end of your history.
                    </div>
                  )}
                </section>
              ) : (
                !currentReceipt && (
                  <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 animate-in fade-in duration-500">
                    <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="h-8 w-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">No receipts yet</h3>
                    <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">Upload your first receipt using the panel on the left to start tracking your expenses.</p>
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