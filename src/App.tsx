import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  UserPlus, 
  ShoppingBag, 
  Gift, 
  Trash2, 
  Edit2, 
  X, 
  ChevronRight, 
  History,
  AlertTriangle,
  RotateCcw,
  Lock,
  LogIn,
  StickyNote,
  FileText,
  Clock,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, Ranking } from './types';
import { storage } from './services/storage';


export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'purchase' | 'redeem' | 'delete' | null>(null);
  const [isRedeemConfirming, setIsRedeemConfirming] = useState(false);
  
  // Form States
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', cardNumber: '' });
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [redeemPoints, setRedeemPoints] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [memoText, setMemoText] = useState('');
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'cardNumber' | 'points'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setCustomers(storage.getCustomers());
  };

  const LOW_BALANCE_THRESHOLD = 10;

  const calculateStats = (customer: Customer) => {
    const totalPoints = customer.purchases.reduce((sum, p) => sum + p.points, 0);
    const redeemedPoints = customer.redemptions.reduce((sum, r) => sum + r.points, 0);
    const balancePoints = totalPoints - redeemedPoints;
    
    let ranking: Ranking = 'Silver';
    if (balancePoints >= 200) ranking = 'Platinum';
    else if (balancePoints >= 100) ranking = 'Green';
    else if (balancePoints >= 50) ranking = 'Gold';
    
    const isLowBalance = balancePoints < LOW_BALANCE_THRESHOLD;
    
    return { totalPoints, redeemedPoints, balancePoints, ranking, isLowBalance };
  };

  const filteredCustomers = useMemo(() => {
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.cardNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'cardNumber') {
        comparison = a.cardNumber.localeCompare(b.cardNumber);
      } else if (sortBy === 'points') {
        const pointsA = calculateStats(a).totalPoints;
        const pointsB = calculateStats(b).totalPoints;
        comparison = pointsA - pointsB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [customers, searchQuery, sortBy, sortOrder]);

  const totalStats = useMemo(() => {
    return customers.reduce((acc, c) => {
      const stats = calculateStats(c);
      acc.totalPoints += stats.totalPoints;
      acc.redeemedPoints += stats.redeemedPoints;
      return acc;
    }, { totalPoints: 0, redeemedPoints: 0 });
  }, [customers]);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (customers.some(c => c.cardNumber === customerForm.cardNumber)) {
      alert('Card Number must be unique!');
      return;
    }
    storage.addCustomer(customerForm);
    refreshData();
    closeModals();
  };

  const handleEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer) {
      storage.updateCustomer(selectedCustomer.id, customerForm);
      refreshData();
      closeModals();
    }
  };

  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer && purchaseAmount) {
      storage.addPurchase(selectedCustomer.id, parseFloat(purchaseAmount));
      refreshData();
      closeModals();
    }
  };

  const handleRedeemPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer && redeemPoints) {
      const { balancePoints } = calculateStats(selectedCustomer);
      const pointsToRedeem = parseInt(redeemPoints);
      
      if (pointsToRedeem <= 0) return;

      if (pointsToRedeem > balancePoints) {
        alert('Insufficient points!');
        return;
      }

      if (!isRedeemConfirming) {
        setIsRedeemConfirming(true);
        return;
      }

      storage.addRedemption(selectedCustomer.id, pointsToRedeem);
      refreshData();
      closeModals();
    }
  };

  const handleDeleteCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirm === 'DELETE' && selectedCustomer) {
      storage.deleteCustomer(selectedCustomer.id);
      refreshData();
      closeModals();
      setSelectedCustomer(null);
    }
  };

  const handleSaveMemo = (text: string) => {
    if (selectedCustomer) {
      storage.updateCustomer(selectedCustomer.id, { memo: text });
      refreshData();
      // Update selected customer locally to avoid flicker
      setSelectedCustomer({ ...selectedCustomer, memo: text });
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      setMemoText(selectedCustomer.memo || '');
    }
  }, [selectedCustomer?.id]);

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 300);
    setMemoText(val);
    // Simple auto-save: save on every change (or could debounce)
    handleSaveMemo(val);
  };

  const handleDeleteTransaction = (itemId: string, type: 'purchase' | 'redemption') => {
    if (!selectedCustomer) return;
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      if (type === 'purchase') {
        storage.deletePurchase(selectedCustomer.id, itemId);
      } else {
        storage.deleteRedemption(selectedCustomer.id, itemId);
      }
      refreshData();
      // Update selected customer locally
      const updatedCustomers = storage.getCustomers();
      const updated = updatedCustomers.find(c => c.id === selectedCustomer.id);
      if (updated) setSelectedCustomer(updated);
    }
  };

  const closeModals = () => {
    setActiveModal(null);
    setIsRedeemConfirming(false);
    setCustomerForm({ name: '', phone: '', cardNumber: '' });
    setPurchaseAmount('');
    setRedeemPoints('');
    setDeleteConfirm('');
  };

  const openEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerForm({ name: customer.name, phone: customer.phone, cardNumber: customer.cardNumber });
    setActiveModal('edit');
  };

  const resetForm = () => {
    setSearchQuery('');
    setSelectedCustomer(null);
    closeModals();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
        >
          <div className="bg-brand-blue p-12 flex flex-col items-center text-white">
            <h1 className="text-3xl font-black tracking-tight text-center leading-tight">GadgetZu<br/>Loyalty Manager</h1>
            <p className="text-brand-orange mt-2 text-xs font-bold italic">Tech That Fits Your Life</p>
            <p className="text-blue-100 mt-6 text-sm font-bold uppercase tracking-widest opacity-80">Admin Portal</p>
          </div>
          <div className="p-10 space-y-8">
            <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                <Lock size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">System Status</p>
                <p className="text-sm font-bold text-slate-700">Secure Offline Mode Active</p>
              </div>
            </div>
            <button 
              onClick={() => setIsLoggedIn(true)}
              className="w-full bg-brand-orange text-white py-5 rounded-2xl font-black text-xl hover:bg-orange-600 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <LogIn size={24} />
              Access Dashboard
            </button>
          </div>
        </motion.div>
        <p className="mt-10 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">GadgetZu Tech Solutions</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-600 text-white shadow-2xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col items-center space-y-2">
            <div className="flex justify-between w-full items-center">
              <div className="w-10" /> {/* Spacer */}
              <div className="flex-1 text-center">
                <h1 className="text-2xl font-black tracking-tight uppercase">GadgetZu Loyalty Manager</h1>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-[0.2em] mt-1">Customer Points Management</p>
              </div>
              <button 
                onClick={resetForm}
                className="p-3 hover:bg-white/20 rounded-full transition-all bg-white/10 backdrop-blur-md shadow-lg"
                title="Reset Form"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-8">
        {/* Dashboard Stats Cards */}
        <section className="grid grid-cols-3 gap-3 -mt-10 relative z-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center space-y-2"
          >
            <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
              <UserPlus size={20} />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Customers</p>
            <p className="text-xl font-black text-slate-800">{customers.length}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center space-y-2"
          >
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
              <ShoppingBag size={20} />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Points</p>
            <p className="text-xl font-black text-slate-800">{totalStats.totalPoints}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center space-y-2"
          >
            <div className="bg-orange-50 p-2 rounded-xl text-orange-600">
              <Gift size={20} />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Redeemed</p>
            <p className="text-xl font-black text-slate-800">{totalStats.redeemedPoints}</p>
          </motion.div>
        </section>

        {/* Search Bar Section */}
        <section className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              id="main-search-input"
              type="text"
              placeholder="Search Name or Card Number..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 shrink-0">
              <ArrowUpDown size={14} />
              <span>Sort By:</span>
            </div>
            {[
              { id: 'name', label: 'Name' },
              { id: 'cardNumber', label: 'Card ID' },
              { id: 'points', label: 'Points' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  if (sortBy === option.id) {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(option.id as any);
                    setSortOrder('asc');
                  }
                }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border ${
                  sortBy === option.id 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {option.label} {sortBy === option.id && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Low Balance Threshold: &lt; 10 Points</span>
            </div>
          </div>
        </section>

        {/* Action Grid */}
        <section className="grid grid-cols-2 gap-4">
          {/* Row 1 */}
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveModal('add')}
            className="flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-500 to-blue-700 text-white py-6 px-4 rounded-[16px] font-bold shadow-lg hover:shadow-blue-500/20 transition-all"
          >
            <UserPlus size={28} />
            <span className="text-sm tracking-tight">Add Customer</span>
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => selectedCustomer ? setActiveModal('purchase') : alert('Select a customer first')}
            className="flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white py-6 px-4 rounded-[16px] font-bold shadow-lg hover:shadow-emerald-500/20 transition-all"
          >
            <ShoppingBag size={28} />
            <span className="text-sm tracking-tight">Add Purchase</span>
          </motion.button>

          {/* Row 2 */}
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => selectedCustomer ? setActiveModal('redeem') : alert('Select a customer first')}
            className="flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-orange-400 to-orange-600 text-white py-6 px-4 rounded-[16px] font-bold shadow-lg hover:shadow-orange-500/20 transition-all"
          >
            <Gift size={28} />
            <span className="text-sm tracking-tight">Redeem Points</span>
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById('main-search-input')?.focus()}
            className="flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-purple-500 to-purple-700 text-white py-6 px-4 rounded-[16px] font-bold shadow-lg hover:shadow-purple-500/20 transition-all"
          >
            <Search size={28} />
            <span className="text-sm tracking-tight">Search Customer</span>
          </motion.button>

          {/* Row 3 */}
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => selectedCustomer ? openEdit(selectedCustomer) : alert('Select a customer first')}
            className="flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-teal-500 to-teal-700 text-white py-6 px-4 rounded-[16px] font-bold shadow-lg hover:shadow-teal-500/20 transition-all"
          >
            <Edit2 size={28} />
            <span className="text-sm tracking-tight">Update Customer</span>
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => selectedCustomer ? setActiveModal('delete') : alert('Select a customer first')}
            className="flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-red-500 to-red-700 text-white py-6 px-4 rounded-[16px] font-bold shadow-lg hover:shadow-red-500/20 transition-all"
          >
            <Trash2 size={28} />
            <span className="text-sm tracking-tight">Delete Customer</span>
          </motion.button>
        </section>

        {/* Selected Customer Details */}
        <AnimatePresence mode="wait">
          {selectedCustomer && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className={`p-6 flex justify-between items-center ${
                calculateStats(selectedCustomer).ranking === 'Platinum' ? 'bg-violet-600' :
                calculateStats(selectedCustomer).ranking === 'Green' ? 'bg-emerald-500' :
                calculateStats(selectedCustomer).ranking === 'Gold' ? 'bg-amber-500' : 'bg-slate-400'
              } text-white`}>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black tracking-tight">{selectedCustomer.name}</h2>
                    {calculateStats(selectedCustomer).isLowBalance && (
                      <span className="bg-red-500/20 text-red-100 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-500/30 uppercase tracking-widest animate-pulse">
                        Low Balance
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold opacity-80 mt-1">CARD ID: {selectedCustomer.cardNumber}</p>
                </div>
                <button onClick={() => openEdit(selectedCustomer)} className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-colors backdrop-blur-md">
                  <Edit2 size={20} />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-3 gap-6 text-center bg-slate-50/50 border-b border-slate-100">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">Total</p>
                  <p className="text-2xl font-black text-slate-800">{calculateStats(selectedCustomer).totalPoints}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">Redeemed</p>
                  <p className="text-2xl font-black text-slate-800">{calculateStats(selectedCustomer).redeemedPoints}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">Balance</p>
                  <div className="flex items-center justify-center gap-2">
                    <p className={`text-3xl font-black ${calculateStats(selectedCustomer).isLowBalance ? 'text-red-500' : 'text-blue-600'}`}>
                      {calculateStats(selectedCustomer).balancePoints}
                    </p>
                    {calculateStats(selectedCustomer).isLowBalance && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-red-500"
                        title="Low Balance Warning"
                      >
                        <AlertTriangle size={20} />
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Memo Section */}
                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 text-amber-800 font-black uppercase text-xs tracking-widest">
                      <StickyNote size={18} className="text-amber-600" />
                      <h3>Customer Memo 📝</h3>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase">{memoText.length}/300</span>
                  </div>
                  <div className="relative">
                    <FileText className="absolute left-0 top-0 text-amber-200" size={40} strokeWidth={1} />
                    <textarea 
                      placeholder="Add a note about this customer..."
                      className="w-full bg-transparent border-none outline-none text-amber-900 font-medium placeholder:text-amber-200 resize-none min-h-[100px] relative z-10 pl-2 pt-1"
                      value={memoText}
                      onChange={handleMemoChange}
                      maxLength={300}
                    />
                  </div>
                  <p className="text-[9px] text-amber-400 font-bold uppercase mt-2 text-right italic">Auto-saving enabled</p>
                </div>

                <div className="flex items-center gap-3 mb-6 text-slate-800 font-black uppercase text-sm tracking-widest">
                  <History className="text-blue-500" size={20} />
                  <h3>Transaction History</h3>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-3 custom-scrollbar">
                  {[...selectedCustomer.purchases, ...selectedCustomer.redemptions]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${'amount' in item ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {'amount' in item ? <ShoppingBag size={20} /> : <Gift size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800">
                              {'amount' in item ? `Purchase: ${item.amount} Tk` : `Points Redeemed`}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock size={12} className="text-slate-400" />
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className={`text-xl font-black ${'amount' in item ? 'text-emerald-600' : 'text-red-500'}`}>
                            {'amount' in item ? `+${item.points}` : `-${item.points}`}
                          </p>
                          <button 
                            onClick={() => handleDeleteTransaction(item.id, 'amount' in item ? 'purchase' : 'redemption')}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  {selectedCustomer.purchases.length === 0 && selectedCustomer.redemptions.length === 0 && (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold text-sm">No transactions yet</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Customer List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Customer Directory</h3>
            <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-full">{filteredCustomers.length} Total</span>
          </div>
          <div className="grid gap-4">
            {filteredCustomers.map(customer => {
              const { ranking, balancePoints, isLowBalance } = calculateStats(customer);
              return (
                <motion.button
                  layout
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`flex items-center justify-between p-5 bg-white rounded-[1.5rem] border-l-[6px] shadow-sm hover:shadow-md transition-all text-left group ${
                    selectedCustomer?.id === customer.id ? 'ring-4 ring-blue-500/10 border-blue-500' : 
                    ranking === 'Platinum' ? 'border-violet-600' :
                    ranking === 'Green' ? 'border-emerald-500' : 
                    ranking === 'Gold' ? 'border-amber-500' : 'border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                      ranking === 'Platinum' ? 'bg-violet-100 text-violet-600' :
                      ranking === 'Green' ? 'bg-emerald-100 text-emerald-600' : 
                      ranking === 'Gold' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                        {customer.name}
                        {customer.memo && <StickyNote size={14} className="text-amber-500" />}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{customer.cardNumber} • {customer.phone}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                      {isLowBalance && (
                        <div className="text-red-500 animate-pulse" title="Low Balance">
                          <AlertTriangle size={14} />
                        </div>
                      )}
                      <p className={`text-2xl font-black ${isLowBalance ? 'text-red-500' : 'text-slate-800'}`}>{balancePoints}</p>
                    </div>
                    <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest">Points</p>
                  </div>
                </motion.button>
              );
            })}
            {filteredCustomers.length === 0 && (
              <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Search size={32} />
                </div>
                <p className="text-slate-400 font-bold">No matching customers found</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {activeModal === 'add' && 'New Customer'}
                  {activeModal === 'edit' && 'Edit Profile'}
                  {activeModal === 'purchase' && 'Log Purchase'}
                  {activeModal === 'redeem' && 'Redeem Points'}
                  {activeModal === 'delete' && 'Delete User'}
                </h3>
                <button onClick={closeModals} className="p-3 hover:bg-white rounded-full transition-all shadow-sm">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8">
                {(activeModal === 'add' || activeModal === 'edit') && (
                  <form onSubmit={activeModal === 'add' ? handleAddCustomer : handleEditCustomer} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Full Name</label>
                        <input 
                          required
                          type="text"
                          className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold"
                          value={customerForm.name}
                          onChange={e => setCustomerForm({...customerForm, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Phone Number</label>
                        <input 
                          required
                          type="tel"
                          className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold"
                          value={customerForm.phone}
                          onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Card Number</label>
                        <input 
                          required
                          type="text"
                          className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold"
                          value={customerForm.cardNumber}
                          onChange={e => setCustomerForm({...customerForm, cardNumber: e.target.value})}
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-brand-orange text-white py-5 rounded-2xl font-black text-lg hover:bg-orange-600 transition-all shadow-xl active:scale-95">
                      {activeModal === 'add' ? 'Create Account' : 'Save Changes'}
                    </button>
                  </form>
                )}

                {activeModal === 'purchase' && (
                  <form onSubmit={handleAddPurchase} className="space-y-8">
                    <div className="text-center">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Purchase Amount (BDT)</label>
                      <input 
                        required
                        autoFocus
                        type="number"
                        placeholder="0.00"
                        className="w-full p-6 text-5xl font-black text-center bg-slate-50 rounded-[2rem] border-2 border-slate-200 outline-none focus:ring-8 focus:ring-brand-orange/10 focus:border-brand-orange text-slate-800"
                        value={purchaseAmount}
                        onChange={e => setPurchaseAmount(e.target.value)}
                      />
                      <div className="mt-6 inline-flex items-center gap-3 bg-orange-50 px-6 py-3 rounded-2xl border border-orange-100">
                        <Gift className="text-brand-orange" size={20} />
                        <p className="text-sm font-black text-orange-800">
                          EARNING: <span className="text-xl">{purchaseAmount ? Math.floor(parseFloat(purchaseAmount) / 70) : 0}</span> POINTS
                        </p>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-brand-orange text-white py-5 rounded-2xl font-black text-xl hover:bg-orange-600 transition-all shadow-xl active:scale-95">
                      Confirm Purchase
                    </button>
                  </form>
                )}

                {activeModal === 'redeem' && (
                  <form onSubmit={handleRedeemPoints} className="space-y-8">
                    {!isRedeemConfirming ? (
                      <div className="text-center">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Points to Redeem</label>
                        <input 
                          required
                          autoFocus
                          type="number"
                          placeholder="0"
                          className="w-full p-6 text-5xl font-black text-center bg-slate-50 rounded-[2rem] border-2 border-slate-200 outline-none focus:ring-8 focus:ring-blue-500/10 focus:border-blue-500 text-slate-800"
                          value={redeemPoints}
                          onChange={e => setRedeemPoints(e.target.value)}
                        />
                        <div className="mt-6 inline-flex items-center gap-3 bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100">
                          <p className="text-sm font-black text-blue-800 uppercase tracking-widest">
                            Available: <span className="text-xl">{selectedCustomer ? calculateStats(selectedCustomer).balancePoints : 0}</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-6">
                        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                          <p className="text-lg font-bold text-blue-900">Confirm Redemption</p>
                          <p className="text-sm text-blue-700 mt-2">
                            Are you sure you want to redeem <span className="font-black text-xl">{redeemPoints}</span> points for <span className="font-black">{selectedCustomer?.name}</span>?
                          </p>
                        </div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">This action will deduct points from the balance.</p>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3">
                      <button type="submit" className={`w-full ${isRedeemConfirming ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand-blue hover:bg-slate-800'} text-white py-5 rounded-2xl font-black text-xl transition-all shadow-xl active:scale-95`}>
                        {isRedeemConfirming ? 'Confirm & Redeem' : 'Redeem Points'}
                      </button>
                      {isRedeemConfirming && (
                        <button 
                          type="button"
                          onClick={() => setIsRedeemConfirming(false)}
                          className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                        >
                          Cancel & Edit
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {activeModal === 'delete' && (
                  <form onSubmit={handleDeleteCustomer} className="space-y-8">
                    <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex gap-4">
                      <AlertTriangle className="text-red-500 shrink-0" size={28} />
                      <p className="text-sm font-bold text-red-900 leading-relaxed">
                        Deleting this customer will permanently erase their profile, purchase history, and all accumulated points. This action is irreversible.
                      </p>
                    </div>
                    <div className="text-center">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Type <span className="text-red-600">DELETE</span> to confirm</label>
                      <input 
                        required
                        autoFocus
                        type="text"
                        placeholder="CONFIRM"
                        className="w-full p-5 text-center text-2xl font-black bg-slate-50 rounded-2xl border-2 border-slate-200 outline-none focus:ring-8 focus:ring-red-500/10 focus:border-red-500 uppercase"
                        value={deleteConfirm}
                        onChange={e => setDeleteConfirm(e.target.value)}
                      />
                    </div>
                    <button 
                      disabled={deleteConfirm !== 'DELETE'}
                      type="submit" 
                      className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-red-700 transition-all shadow-xl disabled:opacity-30 disabled:grayscale active:scale-95"
                    >
                      Delete Permanently
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
