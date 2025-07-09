import api from "@/lib/api";

export interface StoreSettings {
  store_name: string;
  store_description: string;
  store_email: string;
  store_phone: string;
  currency: string;
  timezone: string;
  email_notifications: boolean;
  order_notifications: boolean;
  inventory_alerts: boolean;
  maintenance_mode: boolean;
  allow_guest_checkout: boolean;
  require_email_verification: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  details?: any;
}

/**
 * Fetch current store settings
 */
export const getStoreSettings = async (): Promise<StoreSettings> => {
  try {
    const response = await api.get('/admin/settings/');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching store settings:', error);
    
    // Handle specific error cases
    if (error.response?.status === 404) {
      throw new Error('Settings endpoint not found. Make sure the backend is running and the URL is correct.');
    } else if (error.response?.status === 401) {
      throw new Error('Authentication required. Please log in as an admin.');
    } else if (error.response?.status === 403) {
      throw new Error('Access denied. Admin privileges required.');
    } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      throw new Error('Cannot connect to backend server. Please make sure the backend is running.');
    }
    
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch settings');
  }
};

/**
 * Update all store settings
 */
export const updateStoreSettings = async (settings: Partial<StoreSettings>): Promise<ApiResponse<StoreSettings>> => {
  try {
    const response = await api.put('/admin/settings/', settings);
    return response.data;
  } catch (error: any) {
    console.error('Error updating store settings:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please log in as an admin.');
    } else if (error.response?.status === 403) {
      throw new Error('Access denied. Admin privileges required.');
    } else if (error.response?.status === 400) {
      throw new Error(error.response?.data?.details || 'Invalid data provided.');
    }
    
    throw new Error(error.response?.data?.error || error.message || 'Failed to update settings');
  }
};

/**
 * Update specific section of store settings
 */
export const updateStoreSettingsSection = async (
  section: 'general' | 'notifications' | 'security',
  settings: Partial<StoreSettings>
): Promise<ApiResponse<StoreSettings>> => {
  try {
    const response = await api.patch(`/admin/settings/${section}/`, settings);
    return response.data;
  } catch (error: any) {
    console.error(`Error updating ${section} settings:`, error);
    
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please log in as an admin.');
    } else if (error.response?.status === 403) {
      throw new Error('Access denied. Admin privileges required.');
    } else if (error.response?.status === 400) {
      throw new Error(error.response?.data?.details || 'Invalid data provided.');
    }
    
    throw new Error(error.response?.data?.error || error.message || `Failed to update ${section} settings`);
  }
};

/**
 * Convert frontend settings format to backend format
 */
export const convertToBackendFormat = (frontendSettings: any): Partial<StoreSettings> => {
  return {
    store_name: frontendSettings.storeName,
    store_description: frontendSettings.storeDescription,
    store_email: frontendSettings.storeEmail,
    store_phone: frontendSettings.storePhone,
    currency: frontendSettings.currency,
    timezone: frontendSettings.timezone,
    email_notifications: frontendSettings.emailNotifications,
    order_notifications: frontendSettings.orderNotifications,
    inventory_alerts: frontendSettings.inventoryAlerts,
    maintenance_mode: frontendSettings.maintenanceMode,
    allow_guest_checkout: frontendSettings.allowGuestCheckout,
    require_email_verification: frontendSettings.requireEmailVerification,
  };
};

/**
 * Convert backend settings format to frontend format
 */
export const convertToFrontendFormat = (backendSettings: StoreSettings): any => {
  return {
    storeName: backendSettings.store_name,
    storeDescription: backendSettings.store_description,
    storeEmail: backendSettings.store_email,
    storePhone: backendSettings.store_phone,
    currency: backendSettings.currency,
    timezone: backendSettings.timezone,
    emailNotifications: backendSettings.email_notifications,
    orderNotifications: backendSettings.order_notifications,
    inventoryAlerts: backendSettings.inventory_alerts,
    maintenanceMode: backendSettings.maintenance_mode,
    allowGuestCheckout: backendSettings.allow_guest_checkout,
    requireEmailVerification: backendSettings.require_email_verification,
  };
};
