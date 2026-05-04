/**
 * Composant de filtres pour l'historique des commandes
 */

import { useState } from 'react';
import { OrderStatus } from '../../services/orders.service';
import { format } from 'date-fns';

interface OrdersFiltersProps {
  onFilterChange: (filters: {
    status?: OrderStatus[];
    type?: 'all' | 'local' | 'online';
    dateFrom?: Date;
    dateTo?: Date;
    searchTerm?: string;
  }) => void;
}

export default function OrdersFilters({ onFilterChange }: OrdersFiltersProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>(['delivered', 'cancelled', 'refunded']);
  const [selectedType, setSelectedType] = useState<'all' | 'local' | 'online'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleStatusToggle = (status: OrderStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    
    setSelectedStatuses(newStatuses);
    applyFilters({ status: newStatuses });
  };

  const handleTypeChange = (type: 'all' | 'local' | 'online') => {
    setSelectedType(type);
    applyFilters({ type });
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    applyFilters({ dateFrom: value ? new Date(value) : undefined });
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    applyFilters({ dateTo: value ? new Date(value) : undefined });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    applyFilters({ searchTerm: value });
  };

  const applyFilters = (updates: Partial<{
    status: OrderStatus[];
    type: 'all' | 'local' | 'online';
    dateFrom: Date | undefined;
    dateTo: Date | undefined;
    searchTerm: string;
  }>) => {
    onFilterChange({
      status: updates.status !== undefined ? updates.status : selectedStatuses,
      type: updates.type !== undefined ? updates.type : selectedType,
      dateFrom: updates.dateFrom !== undefined ? updates.dateFrom : (dateFrom ? new Date(dateFrom) : undefined),
      dateTo: updates.dateTo !== undefined ? updates.dateTo : (dateTo ? new Date(dateTo) : undefined),
      searchTerm: updates.searchTerm !== undefined ? updates.searchTerm : searchTerm,
    });
  };

  const handleQuickDate = (days: number) => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - days);
    
    const fromStr = format(from, 'yyyy-MM-dd');
    const toStr = format(today, 'yyyy-MM-dd');
    
    setDateFrom(fromStr);
    setDateTo(toStr);
    applyFilters({ dateFrom: from, dateTo: today });
  };

  return (
    <div className="bg-[#1e2327] border border-slate-700/50 rounded-xl p-6 space-y-6">
      {/* Recherche */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Recherche</label>
        <input
          type="text"
          title="Rechercher une commande"
          placeholder="N° commande, client..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-4 py-2 bg-[#111a22] text-white rounded-lg border border-slate-700 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Période */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Période</label>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Du</label>
            <input
              type="date"
              title="Date de début"
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#111a22] text-white rounded-lg border border-slate-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Au</label>
            <input
              type="date"
              title="Date de fin"
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#111a22] text-white rounded-lg border border-slate-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleQuickDate(0)}
            className="px-3 py-1 bg-[#111a22] hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => handleQuickDate(7)}
            className="px-3 py-1 bg-[#111a22] hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors"
          >
            7 jours
          </button>
          <button
            onClick={() => handleQuickDate(30)}
            className="px-3 py-1 bg-[#111a22] hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors"
          >
            30 jours
          </button>
        </div>
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleTypeChange('all')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedType === 'all' ? 'bg-blue-600 text-white' : 'bg-[#111a22] text-slate-400 hover:text-white'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => handleTypeChange('local')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedType === 'local' ? 'bg-yellow-600 text-white' : 'bg-[#111a22] text-slate-400 hover:text-white'
            }`}
          >
            Local
          </button>
          <button
            onClick={() => handleTypeChange('online')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedType === 'online' ? 'bg-blue-600 text-white' : 'bg-[#111a22] text-slate-400 hover:text-white'
            }`}
          >
            En ligne
          </button>
        </div>
      </div>

      {/* Statut */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Statut</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedStatuses.includes('delivered')}
              onChange={() => handleStatusToggle('delivered')}
              className="w-4 h-4 rounded border-slate-700 bg-[#111a22] text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-300">Livrées</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedStatuses.includes('cancelled')}
              onChange={() => handleStatusToggle('cancelled')}
              className="w-4 h-4 rounded border-slate-700 bg-[#111a22] text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-slate-300">Annulées</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedStatuses.includes('refunded')}
              onChange={() => handleStatusToggle('refunded')}
              className="w-4 h-4 rounded border-slate-700 bg-[#111a22] text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm text-slate-300">Remboursées</span>
          </label>
        </div>
      </div>
    </div>
  );
}
