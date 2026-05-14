import { useState } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [receiptData, setReceiptData] = useState(null)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setReceiptData(null)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    
    // Package file into a FormData object
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Send it to Python backend
      const response = await fetch('http://localhost:8000/api/extract', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process image')
      }

      const data = await response.json()
      setReceiptData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Smart Receipt Digitizer</h1>
      
      <div className="upload-section">
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={!file || loading}>
          {loading ? 'Processing AI...' : 'Digitize Receipt'}
        </button>
      </div>

      {error && <p className="error">Error: {error}</p>}

      {receiptData && (
        <div className="results-section">
          <h2>Extracted Data</h2>
          <div className="data-card">
            <p><strong>Store:</strong> {receiptData.store_name}</p>
            <p><strong>Date:</strong> {receiptData.date || 'N/A'}</p>
            
            <h3>Items</h3>
            <ul>
              {receiptData.items.map((item, index) => (
                <li key={index}>
                  {item.name} - <strong>${item.price.toFixed(2)}</strong>
                </li>
              ))}
            </ul>
            
            <hr />
            <p><strong>Tax:</strong> ${receiptData.tax_amount.toFixed(2)}</p>
            <p><strong>Total:</strong> ${receiptData.total_amount.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App