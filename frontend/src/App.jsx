import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// ReceiptCard component to display and edit individual receipts
const ReceiptCard = ({ receipt, isNew, onRefresh }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(receipt);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(isNew || false);

  const MAX_ITEMS = 50;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name.includes('amount') || name === 'subtotal' ? parseFloat(value) || 0 : value });
    setValidationError(null);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: field === 'price' ? parseFloat(value) || 0 : value };
    setFormData({ ...formData, items: newItems });
    setValidationError(null);
  };

  const handleAddItem = () => {
    if (formData.items?.length >= MAX_ITEMS) {
      setValidationError(`Maximum limit of ${MAX_ITEMS} items reached.`);
      return;
    }
    setFormData({
      ...formData,
      items: [...(formData.items || []), { name: '', price: 0 }]
    });
    setValidationError(null);
  };

  const handleRemoveItem = (indexToRemove) => {
    if (formData.items?.length <= 1) {
      setValidationError("A receipt must have at least one line item.");
      return;
    }
    setFormData({
      ...formData,
      items: formData.items.filter((_, index) => index !== indexToRemove)
    });
    setValidationError(null);
  };

  const handleSave = async () => {
    const hasBlankItems = formData.items?.some(item => !item.name || item.name.trim() === '');
    if (hasBlankItems) {
      setValidationError("All line items must have a name. Please fill them in or remove the blank rows.");
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/receipts/${receipt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsEditing(false);
        onRefresh(); // Refresh parent data!
      } else {
        setValidationError("Failed to save changes to the database.");
      }
    } catch (error) {
      console.error("Error saving:", error);
      setValidationError("Network error while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const expectedSubtotal = formData.items?.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0) || 0;
  const expectedTotal = expectedSubtotal - (parseFloat(formData.discount_amount) || 0) + (parseFloat(formData.tax_amount) || 0);
  const isSubtotalOff = Math.abs(expectedSubtotal - (formData.subtotal || 0)) > 0.02;
  const isTotalOff = Math.abs(expectedTotal - (formData.total_amount || 0)) > 0.02;
  const showWarning = isSubtotalOff || isTotalOff;

  if (!isEditing) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border ${isNew ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'} overflow-hidden transition-all hover:shadow-md`}>
        <div 
          className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {receipt.store_name}
              {!isExpanded && <span className="text-sm font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">${(receipt.total_amount || 0).toFixed(2)}</span>}
            </h3>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">
              {receipt.date || 'No Date'} • Ref #{receipt.id}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => { 
                e.stopPropagation();
                setIsEditing(true); 
                setIsExpanded(true);
              }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-md transition-colors"
            >
              Edit Fix
            </button>
            <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {isExpanded && (
          <div className="px-6 py-5 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="space-y-3">
              {receipt.items?.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-slate-600">{item.name}</span>
                  <span className="text-slate-900 font-semibold">${(item.price || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-dashed border-slate-200 space-y-2">
              <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span className="font-medium">${(receipt.subtotal || 0).toFixed(2)}</span></div>
              {(receipt.discount_amount || 0) > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span className="font-medium">-${(receipt.discount_amount || 0).toFixed(2)}</span></div>}
              <div className="flex justify-between text-sm text-slate-500"><span>Tax</span><span className="font-medium">${(receipt.tax_amount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100"><span className="text-base font-bold text-slate-900">Total</span><span className="text-xl font-black text-indigo-600">${(receipt.total_amount || 0).toFixed(2)}</span></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-indigo-300 ring-2 ring-indigo-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Store Name</label>
            <input type="text" name="store_name" value={formData.store_name || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div className="w-1/3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Date</label>
            <input type="text" name="date" value={formData.date || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
      </div>
      
      <div className="px-6 py-5 bg-slate-50">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Line Items</label>
        </div>
        
        <div className="space-y-3">
          {formData.items?.map((item, index) => (
            <div key={index} className="flex gap-3 items-center group">
              <input type="text" value={item.name || ''} onChange={(e) => handleItemChange(index, 'name', e.target.value)} placeholder="Item name" className="flex-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" />
              <div className="relative w-32">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-sm">$</span></div>
                <input type="number" step="0.01" value={item.price || 0} onChange={(e) => handleItemChange(index, 'price', e.target.value)} className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" />
              </div>
              <button onClick={() => handleRemoveItem(index)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Remove item">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>

        <button onClick={handleAddItem} className="mt-4 flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Add Line Item
        </button>

        <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs mb-1 ${isSubtotalOff ? 'font-bold text-amber-600' : 'text-slate-500'}`}>Subtotal {isSubtotalOff && `(Expected $${expectedSubtotal.toFixed(2)})`}</label>
            <input type="number" step="0.01" name="subtotal" value={formData.subtotal || 0} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md sm:text-sm ${isSubtotalOff ? 'border-amber-400 bg-amber-50 focus:border-amber-500' : 'border-slate-300'}`} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Discount</label>
            <input type="number" step="0.01" name="discount_amount" value={formData.discount_amount || 0} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tax</label>
            <input type="number" step="0.01" name="tax_amount" value={formData.tax_amount || 0} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1 ${isTotalOff ? 'text-amber-600' : 'text-slate-900'}`}>Total {isTotalOff && `(Expected $${expectedTotal.toFixed(2)})`}</label>
            <input type="number" step="0.01" name="total_amount" value={formData.total_amount || 0} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md sm:text-sm font-bold ${isTotalOff ? 'border-amber-400 bg-amber-50 focus:border-amber-500' : 'border-indigo-400 bg-indigo-50'}`} />
          </div>
        </div>

        {validationError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-sm font-medium text-red-800">{validationError}</p>
          </div>
        )}

        {showWarning && !validationError && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p className="text-sm text-amber-800"><strong>Math Discrepancy:</strong> The numbers entered do not perfectly add up. You can still save if this matches the physical receipt.</p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setIsEditing(false); setFormData(receipt); setValidationError(null); }} className="px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">{isSaving ? 'Saving...' : 'Save & Confirm'}</button>
        </div>
      </div>
    </div>
  );
};

// AnalyticsTab component to display spending analytics with charts
const AnalyticsTab = ({ analyticsData }) => {
  if (!analyticsData || analyticsData.totalSpent === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
        <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        <h3 className="mt-2 text-sm font-medium text-slate-900">No data available</h3>
        <p className="mt-1 text-sm text-slate-500">Upload some receipts to see your spending analytics.</p>
      </div>
    );
  }

  const { totalSpent, spendByDate, spendByStore } = analyticsData;
  const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Extracted Value</h3>
        <p className="mt-2 text-4xl font-extrabold text-indigo-600">${totalSpent.toFixed(2)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Spending by Date</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendByDate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [`$${value.toFixed(2)}`, 'Spent']} />
                <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Spending by Store</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={spendByStore} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="amount">
                  {spendByStore.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [`$${value.toFixed(2)}`, 'Spent']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            {spendByStore.slice(0, 6).map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5 text-sm text-slate-600">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main app component
function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [history, setHistory] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("receipts");

  // Fetch history when search term changes or app loads
  useEffect(() => { 
    fetchHistory();
  }, [searchTerm]);

  // Fetch analytics when app loads
  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchHistory = async () => {
    try {
      const url = searchTerm 
        ? `http://localhost:8000/api/receipts?search=${encodeURIComponent(searchTerm)}`
        : 'http://localhost:8000/api/receipts';
        
      const res = await fetch(url);
      if (res.ok) setHistory(await res.json());
    } catch (err) { console.error("Failed to load history", err); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/analytics');
      if (res.ok) setAnalyticsData(await res.json());
    } catch (err) { console.error("Failed to load analytics", err); }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setCurrentReceipt(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('http://localhost:8000/api/extract', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to process image');
      const data = await response.json();
      setCurrentReceipt(data);
      fetchHistory();
      fetchAnalytics(); // Also refresh analytics after a new upload!
      setActiveTab("receipts");
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  // We wrap fetchHistory so ReceiptCard can trigger both refreshes
  const handleDataRefresh = () => {
    fetchHistory();
    fetchAnalytics();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
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
            {error && <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100 text-red-600 text-sm font-medium">{error}</div>}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex border-b border-slate-200">
            <button 
              onClick={() => setActiveTab("receipts")}
              className={`pb-4 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "receipts" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              My Receipts
            </button>
            <button 
              onClick={() => setActiveTab("analytics")}
              className={`pb-4 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "analytics" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
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
              
              {history.length > 0 && (
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full">{history.length} records</span>
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
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App