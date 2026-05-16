import { useState } from 'react';
import toast from 'react-hot-toast'; // <-- NEW: Import the toast library!

const ReceiptCard = ({ receipt, isNew, onRefresh }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(receipt);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(isNew || false);

  const MAX_ITEMS = 50;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name.includes('amount') || name === 'subtotal' ? parseFloat(value) || 0 : value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: field === 'price' ? parseFloat(value) || 0 : value };
    setFormData({ ...formData, items: newItems });
  };

  const handleAddItem = () => {
    if (formData.items?.length >= MAX_ITEMS) {
      toast.error(`Maximum limit of ${MAX_ITEMS} items reached.`); // <-- UPGRADED
      return;
    }
    setFormData({ ...formData, items: [...(formData.items || []), { name: '', price: 0 }] });
  };

  const handleRemoveItem = (indexToRemove) => {
    if (formData.items?.length <= 1) {
      toast.error("A receipt must have at least one line item."); // <-- UPGRADED
      return;
    }
    setFormData({ ...formData, items: formData.items.filter((_, index) => index !== indexToRemove) });
  };

  const handleSave = async () => {
    const hasBlankItems = formData.items?.some(item => !item.name || item.name.trim() === '');
    if (hasBlankItems) {
      toast.error("All line items must have a name."); // <-- UPGRADED
      return;
    }

    setIsSaving(true);
    
    // NEW: We can use toast.promise to automatically handle loading, success, and error states!
    const savePromise = fetch(`http://localhost:8000/api/receipts/${receipt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Failed to save to database");
      return res.json();
    });

    toast.promise(savePromise, {
      loading: 'Saving changes...',
      success: 'Receipt updated successfully!',
      error: 'Failed to save changes.',
    });

    try {
      const updatedReceipt = await savePromise;
      setIsEditing(false);
      onRefresh('update', updatedReceipt);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete the receipt for ${receipt.store_name}?`)) {
      return;
    }

    setIsDeleting(true);
    
    const deletePromise = fetch(`http://localhost:8000/api/receipts/${receipt.id}`, {
      method: 'DELETE',
    }).then(res => {
      if (!res.ok) throw new Error("Failed to delete");
    });

    toast.promise(deletePromise, {
      loading: 'Deleting...',
      success: 'Receipt permanently deleted.',
      error: 'Failed to delete receipt.',
    });

    try {
      await deletePromise;
      onRefresh('delete', receipt.id);
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setIsDeleting(false);
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
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {receipt.store_name}
              {!isExpanded && <span className="text-sm font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">${(receipt.total_amount || 0).toFixed(2)}</span>}
            </h3>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{receipt.date || 'No Date'} • Ref #{receipt.id}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsExpanded(true); }} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-md transition-colors">Edit</button>
            <button onClick={handleDelete} disabled={isDeleting} className={`p-1.5 rounded-md transition-colors ${isDeleting ? 'text-slate-300' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`} title="Delete Receipt">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        {isExpanded && (
          <div className="px-6 py-5 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="space-y-3">
              {receipt.items?.map((item, index) => (
                <div key={index} className="flex justify-between text-sm"><span className="text-slate-600">{item.name}</span><span className="text-slate-900 font-semibold">${(item.price || 0).toFixed(2)}</span></div>
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
          <div className="flex-1"><label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Store Name</label><input type="text" name="store_name" value={formData.store_name || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div>
          <div className="w-1/3"><label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Date</label><input type="text" name="date" value={formData.date || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div>
        </div>
      </div>
      <div className="px-6 py-5 bg-slate-50">
        <div className="flex justify-between items-center mb-3"><label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Line Items</label></div>
        <div className="space-y-3">
          {formData.items?.map((item, index) => (
            <div key={index} className="flex gap-3 items-center group">
              <input type="text" value={item.name || ''} onChange={(e) => handleItemChange(index, 'name', e.target.value)} placeholder="Item name" className="flex-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" />
              <div className="relative w-32"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-sm">$</span></div><input type="number" step="0.01" value={item.price || 0} onChange={(e) => handleItemChange(index, 'price', e.target.value)} className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" /></div>
              <button onClick={() => handleRemoveItem(index)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Remove item"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
          ))}
        </div>
        <button onClick={handleAddItem} className="mt-4 flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>Add Line Item</button>
        <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
          <div><label className={`block text-xs mb-1 ${isSubtotalOff ? 'font-bold text-amber-600' : 'text-slate-500'}`}>Subtotal {isSubtotalOff && `(Expected $${expectedSubtotal.toFixed(2)})`}</label><input type="number" step="0.01" name="subtotal" value={formData.subtotal || 0} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md sm:text-sm ${isSubtotalOff ? 'border-amber-400 bg-amber-50 focus:border-amber-500' : 'border-slate-300'}`} /></div>
          <div><label className="block text-xs text-slate-500 mb-1">Discount</label><input type="number" step="0.01" name="discount_amount" value={formData.discount_amount || 0} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" /></div>
          <div><label className="block text-xs text-slate-500 mb-1">Tax</label><input type="number" step="0.01" name="tax_amount" value={formData.tax_amount || 0} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" /></div>
          <div><label className={`block text-xs font-bold mb-1 ${isTotalOff ? 'text-amber-600' : 'text-slate-900'}`}>Total {isTotalOff && `(Expected $${expectedTotal.toFixed(2)})`}</label><input type="number" step="0.01" name="total_amount" value={formData.total_amount || 0} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md sm:text-sm font-bold ${isTotalOff ? 'border-amber-400 bg-amber-50 focus:border-amber-500' : 'border-indigo-400 bg-indigo-50'}`} /></div>
        </div>
        
        {/* Note: I kept the math warning inline because it's helpful persistent feedback, but removed the red error banner! */}
        {showWarning && <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2"><svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg><p className="text-sm text-amber-800"><strong>Math Discrepancy:</strong> The numbers entered do not perfectly add up.</p></div>}
        
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setIsEditing(false); setFormData(receipt); }} className="px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">{isSaving ? 'Saving...' : 'Save & Confirm'}</button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptCard;