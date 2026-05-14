import { useState, useEffect } from 'react'

function App() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentReceipt, setCurrentReceipt] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/receipts')
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch (err) {
      console.error("Failed to load history", err)
    }
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
      const response = await fetch('http://localhost:8000/api/extract', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to process image')

      const data = await response.json()
      setCurrentReceipt(data)
      fetchHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Modern Receipt Card Component
  const ReceiptCard = ({ receipt, isNew }) => (
    <div className={`bg-white rounded-xl shadow-sm border ${isNew ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'} overflow-hidden transition-all hover:shadow-md`}>
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            {receipt.store_name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <span>{receipt.date || 'No Date'}</span>
            <span>•</span>
            <span>Ref #{receipt.id}</span>
          </div>
        </div>
        {isNew && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 animate-pulse border border-indigo-100">
            Just Added
          </span>
        )}
      </div>
      
      {/* Card Body */}
      <div className="px-6 py-5">
        <div className="space-y-3">
          {receipt.items.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="text-slate-600 font-medium">{item.name}</span>
              <span className="text-slate-900 font-semibold">${item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
        
        {/* Totals Section */}
        <div className="mt-6 pt-4 border-t border-dashed border-slate-200 space-y-2">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span className="font-medium">${receipt.subtotal.toFixed(2)}</span>
          </div>
          {receipt.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount</span>
              <span className="font-medium">-${receipt.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-slate-500">
            <span>Tax</span>
            <span className="font-medium">${receipt.tax_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100">
            <span className="text-base font-bold text-slate-900">Total</span>
            <span className="text-xl font-black text-indigo-600">${receipt.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">ReceiptAI</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Upload Controls (Sticky) */}
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
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    {file ? file.name : "Click to select an image"}
                  </p>
                  <p className="text-xs text-slate-500">JPG, PNG, or HEIC</p>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleUpload} 
                disabled={!file || loading}
                className={`mt-6 w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-white transition-all
                  ${!file || loading 
                    ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5'}`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Digitizing...
                  </span>
                ) : 'Extract Data'}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100 text-red-600 text-sm font-medium flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Data & History */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Active Receipt */}
            {currentReceipt && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-extrabold text-slate-900 mb-4">Latest Scan</h2>
                <ReceiptCard receipt={currentReceipt} isNew={true} />
              </section>
            )}

            {/* History Grid */}
            {history.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Receipt History
                  </h2>
                  <span className="text-sm font-medium text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full">
                    {history.length} records
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {history
                    .filter(rec => !currentReceipt || rec.id !== currentReceipt.id)
                    .map((receipt) => (
                      <ReceiptCard key={receipt.id} receipt={receipt} isNew={false} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {!currentReceipt && history.length === 0 && (
              <div className="h-96 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-slate-200 border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No receipts yet</h3>
                <p className="text-slate-500 max-w-sm">Upload your first receipt using the panel on the left to see the AI magic in action.</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}

export default App