import { useState, useEffect } from 'react'

function App() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentReceipt, setCurrentReceipt] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)

  // Fetch history when the app loads
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
      fetchHistory() // Refresh the history list after a successful upload
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper component to render a receipt card
  const ReceiptCard = ({ receipt, isNew }) => (
    <div className={`bg-white rounded-2xl shadow-sm border ${isNew ? 'border-indigo-300 ring-4 ring-indigo-50' : 'border-slate-200'} overflow-hidden mb-6`}>
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-semibold text-slate-900">
            {receipt.store_name}
          </h3>
          <div className="flex gap-2 items-center mt-1 text-sm text-slate-500">
            <span>{receipt.date || 'No date'}</span>
            <span>•</span>
            <span>ID: #{receipt.id}</span>
          </div>
        </div>
        {isNew && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 animate-pulse">
            Just Added
          </span>
        )}
      </div>
      
      <div className="px-6 py-5">
        <ul className="divide-y divide-slate-200">
          {receipt.items.map((item, index) => (
            <li key={index} className="py-3 flex justify-between">
              <span className="text-slate-700">{item.name}</span>
              <span className="text-slate-900 font-medium">${item.price.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        
        <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>${receipt.subtotal.toFixed(2)}</span>
          </div>
          {receipt.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount</span>
              <span>-${receipt.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-slate-600">
            <span>Tax</span>
            <span>${receipt.tax_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-900 pt-3 border-t border-slate-200">
            <span>Total</span>
            <span>${receipt.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Smart Receipt Digitizer
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Upload a receipt and let AI extract the structured data.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 hover:bg-slate-100 transition-colors">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>
          
          <button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className={`mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white 
              ${!file || loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'} 
              transition-all`}
          >
            {loading ? 'Processing AI...' : 'Digitize Receipt'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200 text-red-700 text-sm">
              Error: {error}
            </div>
          )}
        </div>

        {/* Display newly uploaded receipt at the top */}
        {currentReceipt && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Latest Scan</h2>
            <ReceiptCard receipt={currentReceipt} isNew={true} />
          </div>
        )}

        {/* Display history */}
        {history.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Receipt History</h2>
            <div className="space-y-6">
              {history
                .filter(rec => !currentReceipt || rec.id !== currentReceipt.id) // Hide duplicate if it's the current one
                .map((receipt) => (
                  <ReceiptCard key={receipt.id} receipt={receipt} isNew={false} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default App