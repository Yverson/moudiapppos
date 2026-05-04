/**
 * Service de gestion des sessions (X et Z)
 */

import axios from 'axios';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductSales {
  nomProduit: string;
  quantiteTotale: number;
  montantTotal: number;
  prixUnitaireMoyen: number;
}

export interface Session {
  id: string;
  restaurantId: string;
  restaurantName: string;
  type: 'X' | 'Z';
  dateOuverture: string;
  dateFermeture?: string;
  estOuverte: boolean;
  caTotal: number;
  nombreCommandes: number;
  notes?: string;
}

export interface SessionWithProducts extends Session {
  produitsVendus: ProductSales[];
}

export interface CreateSessionRequest {
  type: 'X' | 'Z';
  notes?: string;
}

export interface CloseSessionRequest {
  notes?: string;
}

// ─── API Service ──────────────────────────────────────────────────────────────

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5084';
const api = axios.create({
  baseURL,
  timeout: 10000,
});

// Intercepteur pour ajouter le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const API_BASE = '/api/proprietaire';

/**
 * Récupérer toutes les sessions du propriétaire
 */
export async function getAllSessions(ouvertesSeulement?: boolean): Promise<Session[]> {
  const params = ouvertesSeulement !== undefined ? `?ouvertesSeulement=${ouvertesSeulement}` : '';
  const response = await api.get(`${API_BASE}/sessions${params}`);
  return response.data?.data || [];
}

/**
 * Récupérer les sessions d'un restaurant spécifique
 */
export async function getRestaurantSessions(
  restaurantId: string,
  ouvertesSeulement?: boolean
): Promise<Session[]> {
  const params = ouvertesSeulement !== undefined ? `?ouvertesSeulement=${ouvertesSeulement}` : '';
  const response = await api.get(`${API_BASE}/restaurants/${restaurantId}/sessions${params}`);
  return response.data?.data || [];
}

/**
 * Récupérer une session par son ID
 */
export async function getSessionById(id: string): Promise<Session | null> {
  const response = await api.get(`${API_BASE}/sessions/${id}`);
  return response.data?.data || null;
}

/**
 * Récupérer les détails des produits vendus pour une session (Rapport X ou Z)
 */
export async function getSessionProductSales(id: string): Promise<SessionWithProducts | null> {
  const response = await api.get(`${API_BASE}/sessions/${id}/products`);
  return response.data?.data || null;
}

/**
 * Créer une nouvelle session (X ou Z)
 */
export async function createSession(
  restaurantId: string,
  data: CreateSessionRequest
): Promise<Session> {
  const response = await api.post(`${API_BASE}/restaurants/${restaurantId}/sessions`, data);
  return response.data?.data;
}

/**
 * Fermer une session
 */
export async function closeSession(id: string, data?: CloseSessionRequest): Promise<Session> {
  const response = await api.patch(`${API_BASE}/sessions/${id}/close`, data);
  return response.data?.data;
}

/**
 * Formater le montant en F CFA
 */
export function formatMontantFCFA(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
}

/**
 * Formater la date de session
 */
export function formatSessionDate(dateString: string): string {
  return new Date(dateString).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
