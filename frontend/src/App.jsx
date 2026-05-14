import { useState, useEffect } from 'react'

const ReceiptCard = ({ receipt, isNew, onRefresh }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(receipt);
  const [isSaving, setIsSaving] = useState(false);

  // Handle changes to top-level fields (store, date, totals)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name.includes('amount') || name === 'subtotal' ? parseFloat(value) || 0 : value });
  };

  // Handle changes to specific items in the array
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: field === 'price' ? parseFloat(value) || 0 : value };
    setFormData({ ...formData, items: newItems });
  };

  // Send the updated data back to our FastAPI backend
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:8000/api/receipts/${receipt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsEditing(false);
        onRefresh(); // Tell the main App to fetch the updated history
      } else {
        alert("Failed to save changes.");
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // If we are NOT editing, show the clean UI
  if (!isEditing) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border ${isNew ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'} overflow-hidden transition-all hover:shadow-md`}>
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">{receipt.store_name}</h3>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">
              {receipt.date || 'No Date'} • Ref #{receipt.id}
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-md"
          >
            Edit Fix
          </button>
        </div>
        
        <div className="px-6 py-5">
          <div className="space-y-3">
            {receipt.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-slate-600">{item.name}</span>
                <span className="text-slate-900 font-semibold">${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-dashed border-slate-200 space-y-2">
            <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span className="font-medium">${receipt.subtotal.toFixed(2)}</span></div>
            {receipt.discount_amount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span className="font-medium">-${receipt.discount_amount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-sm text-slate-500"><span>Tax</span><span className="font-medium">${receipt.tax_amount.toFixed(2)}</span></div>
            <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100"><span className="text-base font-bold text-slate-900">Total</span><span className="text-xl font-black text-indigo-600">${receipt.total_amount.toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    );
  }

  // If we ARE editing, show the input forms!
  return (
    <div className="bg-white rounded-xl shadow-lg border border-indigo-300 ring-2 ring-indigo-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Store Name</label>
            <input type="text" name="store_name" value={formData.store_name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div className="w-1/3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Date</label>
            <input type="text" name="date" value={formData.date || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
      </div>
      
      <div className="px-6 py-5 bg-slate-50">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Line Items</label>
        <div className="space-y-3">
          {formData.items.map((item, index) => (
            <div key={index} className="flex gap-4">
              <input type="text" value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" />
              <div className="relative w-32">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-sm">$</span></div>
                <input type="number" step="0.01" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Subtotal</label>
            <input type="number" step="0.01" name="subtotal" value={formData.subtotal} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Discount</label>
            <input type="number" step="0.01" name="discount_amount" value={formData.discount_amount} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tax</label>
            <input type="number" step="0.01" name="tax_amount" value={formData.tax_amount} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Total</label>
            <input type="number" step="0.01" name="total_amount" value={formData.total_amount} onChange={handleChange} className="w-full px-3 py-2 border border-indigo-400 bg-indigo-50 rounded-md sm:text-sm font-bold" />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setIsEditing(false); setFormData(receipt); }} className="px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            {isSaving ? 'Saving...' : 'Save & Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
function App() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentReceipt, setCurrentReceipt] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => { fetchHistory() }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/receipts')
      if (res.ok) setHistory(await res.json())
    } catch (err) { console.error("Failed to load history", err) }
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setCurrentReceipt(null)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch('http://localhost:8000/api/extract', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Failed to process image')
      setCurrentReceipt(await response.json())
      fetchHistory()
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

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

        <div className="lg:col-span-8 space-y-8">
          {currentReceipt && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-extrabold text-slate-900 mb-4">Latest Scan</h2>
              <ReceiptCard receipt={currentReceipt} isNew={true} onRefresh={fetchHistory} />
            </section>
          )}
          {history.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-extrabold text-slate-900">Receipt History</h2>
                <span className="text-sm font-medium text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full">{history.length} records</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {history.filter(rec => !currentReceipt || rec.id !== currentReceipt.id).map((receipt) => (
                  <ReceiptCard key={receipt.id} receipt={receipt} isNew={false} onRefresh={fetchHistory} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default App