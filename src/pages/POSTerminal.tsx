import { useEffect, useMemo, useState, useCallback } from 'react';
import PaymentModal from '../components/PaymentModal';
import { useCategories, useMenuItems, useOrders } from '../hooks/useDatabase';
import offlineOrderService, { Order as OfflineOrder } from '../services/offline-order.service';
import livreurService, { Livreur } from '../services/livreur.service';
import { formatAmount } from '../utils/format';
import { useActiveRestaurant } from '../services/restaurant-config';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
}

export default function POSTerminal() {
  const { categories, loading: loadingCategories, error: categoriesError } = useCategories();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const {
    menuItems,
    loading: loadingMenuItems,
    error: menuItemsError,
  } = useMenuItems(activeCategoryId || undefined);

  const { id: restaurantId } = useActiveRestaurant();

  const { orders: pendingOrders, refresh: refreshPendingOrders } = useOrders('pending_local');
  const { orders: deliveryOrders, refresh: refreshDeliveryOrders } = useOrders('pending_delivery');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const [tableNumber, setTableNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [livreurName, setLivreurName] = useState<string>('');
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [selectedLivreurId, setSelectedLivreurId] = useState<string>('');
  const [tableError, setTableError] = useState<string>('');

  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeCategoryId && categories.length > 0) {
      setActiveCategoryId(categories[0].id);
    }
  }, [activeCategoryId, categories]);

  // Charger les livreurs (tous, puis filtrer les actifs pour le dropdown)
  const loadLivreurs = useCallback(async () => {
    try {
      const data = await livreurService.getLivreurs(restaurantId, false);
      setLivreurs(data.filter(l => l.active));
    } catch (err) {
      console.error('Erreur chargement livreurs:', err);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadLivreurs();
  }, [loadLivreurs]);

  const categoryButtons = useMemo(() => {
    return categories
      .filter(c => c.active)
      .sort((a, b) => a.order - b.order);
  }, [categories]);

  const addToOrder = (product: { id: string; name: string; price: number; note?: string }) => {
    const existing = orderItems.find(item => item.id === product.id);
    if (existing) {
      setOrderItems(orderItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setOrderItems([...orderItems, { ...product, quantity: 1 }]);
    }
  };

  const incrementQty = (itemId: string) => {
    setOrderItems(prev =>
      prev.map(i => (i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i)),
    );
  };

  const decrementQty = (itemId: string) => {
    setOrderItems(prev => {
      const current = prev.find(i => i.id === itemId);
      if (!current) return prev;
      if (current.quantity <= 1) {
        return prev.filter(i => i.id !== itemId);
      }
      return prev.map(i => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i));
    });
  };

  const deleteItem = (itemId: string) => {
    setOrderItems(prev => prev.filter(i => i.id !== itemId));
  };

  const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const [orderNumber, setOrderNumber] = useState<string>('001');

  const getNextOrderNumber = async (): Promise<string> => {
    try {
      // Récupérer TOUTES les commandes pour éviter les doublons
      const allOrders = await offlineOrderService.getOrders(restaurantId);
      const maxNum = allOrders.reduce((max, o) => {
        const match = o.order_number?.match(/^(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          return Math.max(max, num);
        }
        return max;
      }, 0);
      return String(maxNum + 1).padStart(3, '0');
    } catch (err) {
      console.error('Erreur génération numéro de commande:', err);
      // En cas d'erreur, utiliser un timestamp pour garantir l'unicité
      return `T${Date.now().toString().slice(-6)}`;
    }
  };

  const isTableOccupied = (tableNum: string, excludeOrderId?: string | null): boolean => {
    if (!tableNum) return false;
    return pendingOrders.some((o: any) => {
      if (excludeOrderId && o.id === excludeOrderId) return false;
      const match = o.notes?.match(/Table:(\d+)/i);
      return match?.[1] === tableNum;
    });
  };

  const validateTable = (value: string): boolean => {
    if (!value || value === '') {
      setTableError('Table obligatoire');
      return false;
    }
    if (isTableOccupied(value, currentOrderId)) {
      setTableError('Table déjà occupée');
      return false;
    }
    setTableError('');
    return true;
  };

  const isInCart = useMemo(() => {
    const set = new Set(orderItems.map(i => i.id));
    return (id: string) => set.has(id);
  }, [orderItems]);

  const buildOrderNotes = () => {
    const parts: string[] = [];
    if (tableNumber) parts.push(`Table:${tableNumber}`);
    if (customerName.trim()) parts.push(`Client:${customerName.trim()}`);
    if (livreurName.trim()) parts.push(`Livreur:${livreurName.trim()}`);
    return parts.join(' | ') || undefined;
  };

  const parseOrderNotes = (notes?: string) => {
    if (!notes) return;
    const tableMatch = notes.match(/Table:(\d+)/i);
    const clientMatch = notes.match(/Client:([^|]+)/i);
    const livreurMatch = notes.match(/Livreur:([^|]+)/i);
    if (tableMatch?.[1]) setTableNumber(tableMatch[1]);
    if (clientMatch?.[1]) setCustomerName(clientMatch[1].trim());
    if (livreurMatch?.[1]) setLivreurName(livreurMatch[1].trim());
  };

  const mapStoredItemsToCart = (raw: any[]): OrderItem[] => {
    return raw
      .map((it) => {
        // Accept either cart-like {id,name,price,quantity,note} or offline OrderItem {menu_item_id, quantity, unit_price}
        if (it && typeof it === 'object' && typeof it.id === 'string') {
          return {
            id: String(it.id),
            name: String(it.name || ''),
            price: Number(it.price || 0),
            quantity: Number(it.quantity || 0),
            note: it.note ? String(it.note) : undefined,
          } as OrderItem;
        }

        if (it && typeof it === 'object' && typeof it.menu_item_id === 'string') {
          return {
            id: String(it.menu_item_id),
            name: String(it.name || it.menu_item_name || ''),
            price: Number(it.unit_price || it.price || 0),
            quantity: Number(it.quantity || 0),
            note: it.notes ? String(it.notes) : undefined,
          } as OrderItem;
        }

        return null;
      })
      .filter((x): x is OrderItem => !!x && x.quantity > 0);
  };

  const loadPendingOrder = async (order: any) => {
    setCurrentOrderId(order.id);
    setOrderNumber(order.order_number || '001');
    parseOrderNotes(order.notes);

    // Restaurer le livreur depuis les notes
    if (order.notes) {
      const livreurMatch = order.notes.match(/Livreur:([^|]+)/i);
      if (livreurMatch?.[1]) {
        const livreurNameFromNotes = livreurMatch[1].trim();
        // Chercher le livreur dans la liste pour trouver son ID
        const foundLivreur = livreurs.find(l => 
          `${l.prenom} ${l.nom}` === livreurNameFromNotes
        );
        if (foundLivreur) {
          setSelectedLivreurId(foundLivreur.id);
        }
      }
    }

    try {
      const raw = JSON.parse(order.items || '[]');
      if (Array.isArray(raw)) {
        setOrderItems(mapStoredItemsToCart(raw));
      } else {
        setOrderItems([]);
      }
    } catch {
      setOrderItems([]);
    }
  };

  const saveOrder = async (): Promise<OfflineOrder | null> => {
    if (orderItems.length === 0) return null;
    
    // Validation: table obligatoire
    if (!validateTable(tableNumber)) {
      return null;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const itemsJson = JSON.stringify(orderItems);
      const notes = buildOrderNotes();

      if (!currentOrderId) {
        // Générer un nouveau numéro de commande unique
        const newOrderNumber = await getNextOrderNumber();
        
        const created: OfflineOrder = await offlineOrderService.createOrderObject({
          restaurantId,
          items: [],
          subtotal: total,
          tax: 0,
          total,
          paymentMethod: undefined,
          notes,
        });

        created.items = itemsJson;
        created.subtotal = total;
        created.tax = 0;
        created.total = total;
        created.notes = notes;
        created.updated_at = now;
        created.order_number = newOrderNumber; // Utiliser le numéro généré dynamiquement

        const saved = await offlineOrderService.createOrderOffline(created);
        setCurrentOrderId(saved.id);
        setOrderNumber(newOrderNumber); // Mettre à jour l'état
        await refreshPendingOrders();
        return saved;
      }

      const existingList = await offlineOrderService.getOrders(restaurantId);
      const existing = existingList.find(o => o.id === currentOrderId);
      if (!existing) {
        setCurrentOrderId(null);
        return await saveOrder();
      }

      const updated: OfflineOrder = {
        ...existing,
        subtotal: total,
        tax: 0,
        total,
        items: itemsJson,
        notes,
        updated_at: now,
      };

      const saved = await offlineOrderService.updateOrderOffline(updated);
      await refreshPendingOrders();
      return saved;
    } finally {
      setSaving(false);
    }
  };

  const handlePayClick = async () => {
    // Si une table est renseignée, enregistrer d'abord la commande
    if (tableNumber && tableNumber.trim() !== '') {
      const saved = await saveOrder();
      if (saved) {
        setShowPaymentModal(true);
      }
    } else {
      // Paiement direct sans table (pour les clients qui ne s'assoient pas)
      // Créer une commande temporaire pour permettre le paiement
      setSaving(true);
      try {
        const now = new Date().toISOString();
        const itemsJson = JSON.stringify(orderItems);
        const notes = buildOrderNotes();
        
        // Générer un nouveau numéro de commande unique
        const newOrderNumber = await getNextOrderNumber();
        
        const created: OfflineOrder = await offlineOrderService.createOrderObject({
          restaurantId,
          items: [],
          subtotal: total,
          tax: 0,
          total,
          paymentMethod: undefined,
          notes: notes || 'Commande à emporter',
        });

        created.items = itemsJson;
        created.subtotal = total;
        created.tax = 0;
        created.total = total;
        created.notes = notes || 'Commande à emporter';
        created.updated_at = now;
        created.order_number = newOrderNumber;

        const saved = await offlineOrderService.createOrderOffline(created);
        setCurrentOrderId(saved.id);
        setOrderNumber(newOrderNumber);
        await refreshPendingOrders();
        
        setShowPaymentModal(true);
      } catch (error) {
        console.error('Erreur création commande temporaire:', error);
        alert('Erreur lors de la création de la commande');
      } finally {
        setSaving(false);
      }
    }
  };

  const refreshAllOrders = async () => {
    await refreshPendingOrders();
    await refreshDeliveryOrders();
  };

  const startNewOrder = async () => {
    setShowPaymentModal(false);
    setCurrentOrderId(null);
    setOrderItems([]);
    setTableNumber('');
    setCustomerName('');
    setLivreurName('');
    setSelectedLivreurId('');
    setTableError('');
    const nextNum = await getNextOrderNumber();
    setOrderNumber(nextNum);
  };

  const filteredProducts = menuItems
    .filter(i => i.available)
    .sort((a, b) => a.order - b.order)
    .map(i => ({
      id: i.id,
      name: i.name,
      price: i.price,
      image: i.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
      disabled: isInCart(i.id),
    }));

  const isLoading = loadingCategories || loadingMenuItems;
  const loadError = categoriesError || menuItemsError;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Section 1: Commandes en attente (gauche) */}
      <section className="flex flex-col w-[360px] min-w-[360px] bg-[#1e2327] border-r border-[#30363b]">
        <div className="px-4 pt-4 pb-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[#a4adb6] text-xs font-bold uppercase tracking-wider">Commandes en attente</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Nouvelle commande"
                onClick={startNewOrder}
                className="h-8 px-2 rounded-lg bg-[#233648] hover:bg-[#30363b] text-white text-xs font-bold transition-colors"
              >
                +
              </button>
              <button
                type="button"
                title="Rafraîchir les commandes"
                onClick={() => refreshAllOrders()}
                className="text-[#a4adb6] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* Commandes en attente de paiement */}
            {pendingOrders.length === 0 ? (
              <div className="text-slate-500 text-sm py-2">Aucune commande en attente</div>
            ) : (
              pendingOrders.map((o: any) => (
                <button
                  key={o.id}
                  type="button"
                  title="Charger la commande"
                  onClick={() => loadPendingOrder(o)}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-left ${
                    currentOrderId === o.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#30363b] bg-[#22262a] hover:bg-[#30363b]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold text-sm truncate">{o.order_number ? `#${o.order_number}` : o.id.slice(0, 8)}</span>
                    {(o.sync_status === 'pending' || o.sync_status === 'error') && (
                      <span
                        title="Commande locale, sera synchronisée quand internet disponible"
                        className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      >
                        LOCAL
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#a4adb6] truncate">{o.notes || '—'}</div>
                  <div className="text-xs text-emerald-400 font-bold mt-1">{formatAmount(Number(o.total || 0))}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Grille produits + catégories (centre) */}
      <section className="flex flex-col flex-1 border-r border-[#30363b] bg-[#16191c] min-w-0">
        <div className="px-6 pt-6 pb-2 space-y-4">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {categoryButtons.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`flex items-center gap-3 px-8 py-5 rounded-2xl border-2 transition-all font-bold text-lg min-w-[160px] justify-center shadow-lg active:scale-95 ${
                  activeCategoryId === cat.id
                    ? 'bg-blue-900/30 border-blue-800 text-blue-200'
                    : 'bg-[#22262a] border-[#30363b] text-[#a4adb6] hover:bg-[#30363b]'
                }`}
                title={cat.name}
              >
                <span className="material-symbols-outlined text-2xl">{cat.icon || 'category'}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {loadError && (
            <div className="mb-4 bg-red-600/20 border border-red-600/40 rounded-lg p-4 text-red-200">
              {loadError}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center text-slate-400 py-10">Chargement...</div>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {!isLoading && filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => {
                  if (!product.disabled) addToOrder(product);
                }}
                disabled={product.disabled}
                title={product.disabled ? 'Déjà ajouté' : product.name}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#1e2327] border-2 transition-all h-56 shadow-md ${
                  product.disabled
                    ? 'border-[#30363b] opacity-40 cursor-not-allowed'
                    : 'border-[#30363b] hover:border-blue-500/80 hover:bg-[#252b30] active:scale-95'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10"></div>
                <img
                  className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                  src={product.image}
                  alt={product.name}
                />
                <div className="relative z-20 p-4 flex justify-end">
                  <span className="bg-blue-600/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-lg font-bold text-white shadow-lg">
                    {formatAmount(product.price)}
                  </span>
                </div>
                <div className="relative z-20 p-5 mt-auto w-full">
                  <div className="h-1.5 w-12 bg-blue-500 rounded-full mb-3 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                  <h3 className="text-white font-bold text-2xl leading-tight text-left shadow-black drop-shadow-lg">
                    {product.name}
                  </h3>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Panier (droite) */}
      <section className="flex flex-col w-[420px] min-w-[420px] bg-[#1e2327] border-l border-[#30363b]">
        <div className="flex items-center justify-between p-4 border-b border-[#30363b] bg-[#22262a]">
          <div className="flex flex-col w-full">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#a4adb6] uppercase font-bold tracking-wider">Table *</span>
              <input
                type="number"
                title="Numéro de table (obligatoire)"
                min={1}
                value={tableNumber}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === '') {
                    setTableNumber('');
                    setTableError('Table obligatoire');
                    return;
                  }
                  const parsed = parseInt(next, 10);
                  if (!Number.isNaN(parsed) && parsed > 0) {
                    setTableNumber(String(parsed));
                    validateTable(String(parsed));
                  }
                }}
                className={`w-24 h-8 rounded-lg bg-[#30363b] text-white font-bold text-sm px-2 outline-none border ${
                  tableError ? 'border-red-500' : 'border-[#3a4249] focus:border-blue-500'
                }`}
                placeholder="-"
              />
            </div>
            {tableError && <span className="text-red-400 text-xs mt-1">{tableError}</span>}
            <input
              type="text"
              title="Nom du client (optionnel)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-2 h-8 rounded-lg bg-[#30363b] text-white font-bold text-sm px-2 outline-none border border-[#3a4249] focus:border-blue-500"
              placeholder="Client (optionnel)"
            />
            <select
              title="Sélectionner un livreur (optionnel)"
              value={selectedLivreurId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedLivreurId(id);
                const livreur = livreurs.find(l => l.id === id);
                setLivreurName(livreur ? `${livreur.prenom} ${livreur.nom}` : '');
              }}
              className="mt-2 h-8 rounded-lg bg-[#30363b] text-white font-bold text-sm px-2 outline-none border border-[#3a4249] focus:border-blue-500 w-full"
            >
              <option value="">-- Livreur (optionnel) --</option>
              {livreurs.map((livreur) => (
                <option key={livreur.id} value={livreur.id}>
                  {livreur.prenom} {livreur.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="text-right ml-4">
            <span className="text-sm text-[#a4adb6] block font-medium">Order #{orderNumber}</span>
            <span className="text-sm text-[#577798] font-bold uppercase">Dine In</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#252b30] z-10 shadow-sm">
              <tr>
                <th className="py-3 px-4 text-xs font-bold text-[#a4adb6] uppercase tracking-wider w-[50%]">Item</th>
                <th className="py-3 px-2 text-xs font-bold text-[#a4adb6] uppercase tracking-wider text-center w-[20%]">Qty</th>
                <th className="py-3 px-4 text-xs font-bold text-[#a4adb6] uppercase tracking-wider text-right w-[30%]">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363b]">
              {orderItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#2a3036] group cursor-pointer h-16">
                  <td className="py-3 px-4">
                    <p className="font-bold text-white text-lg">{item.name}</p>
                    {item.note && <p className="text-sm text-[#a4adb6] font-medium">{item.note}</p>}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        title="Diminuer la quantité"
                        onClick={(e) => {
                          e.stopPropagation();
                          decrementQty(item.id);
                        }}
                        className="w-9 h-9 rounded-lg bg-[#30363b] hover:bg-[#3a4249] text-white font-bold text-lg transition-colors"
                      >
                        -
                      </button>
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#30363b] text-white font-bold text-lg">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        title="Augmenter la quantité"
                        onClick={(e) => {
                          e.stopPropagation();
                          incrementQty(item.id);
                        }}
                        className="w-9 h-9 rounded-lg bg-[#30363b] hover:bg-[#3a4249] text-white font-bold text-lg transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-white text-lg">
                    <div className="flex items-center justify-end gap-3">
                      <span>{formatAmount(item.price * item.quantity)}</span>
                      <button
                        type="button"
                        title="Supprimer l'article"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(item.id);
                        }}
                        className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-colors inline-flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-none bg-[#171a1c] border-t border-[#30363b] p-4 flex flex-col gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-20">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex justify-between items-end">
              <span className="text-xl font-bold text-white">Total</span>
              <span className="text-4xl font-bold text-white tracking-tight">{formatAmount(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              title="Enregistrer la commande (Table obligatoire)"
              onClick={() => saveOrder()}
              disabled={saving || orderItems.length === 0 || !tableNumber || !!tableError}
              className={`w-full rounded-xl py-4 font-bold text-xl tracking-wide transition-all border ${
                saving || orderItems.length === 0 || !tableNumber || !!tableError
                  ? 'bg-[#30363b] text-[#a4adb6] border-[#30363b] cursor-not-allowed'
                  : 'bg-[#233648] hover:bg-[#30363b] text-white border-[#3a4249]'
              }`}
            >
              {saving ? 'ENREG...' : 'ENREGISTRER'}
            </button>

            <button
              type="button"
              title="Payer directement (avec ou sans table)"
              onClick={handlePayClick}
              disabled={saving || orderItems.length === 0}
              className={`w-full rounded-xl py-4 font-bold text-xl tracking-wide transition-all flex items-center justify-center gap-3 ${
                saving || orderItems.length === 0
                  ? 'bg-[#30363b] text-[#a4adb6] cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/40 active:scale-[0.98]'
              }`}
            >
              <span>PAYER</span>
              <span className="material-symbols-outlined text-3xl">payments</span>
            </button>
          </div>

          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            total={total}
            orderId={currentOrderId || 'order-unknown'}
            onPaymentSuccess={async () => {
              await startNewOrder();
              await refreshAllOrders();
            }}
          />
        </div>
      </section>
    </div>
  );
}
