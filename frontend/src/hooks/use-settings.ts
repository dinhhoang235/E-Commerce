import { useState, useEffect } from 'react'
import { 
  getStoreSettings, 
  updateStoreSettingsSection, 
  convertToBackendFormat, 
  convertToFrontendFormat,
  type StoreSettings
} from '@/lib/services/settings'

interface SettingsState {
  storeName: string
  storeDescription: string
  storeEmail: string
  storePhone: string
  currency: string
  timezone: string
  emailNotifications: boolean
  orderNotifications: boolean
  inventoryAlerts: boolean
  maintenanceMode: boolean
  allowGuestCheckout: boolean
  requireEmailVerification: boolean
}

interface UseSettingsReturn {
  settings: SettingsState
  loading: boolean
  saving: string | null
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>
  handleSave: (section: 'general' | 'notifications' | 'security') => Promise<any>
  loadSettings: () => Promise<void>
}

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<SettingsState>({
    storeName: "Apple Store",
    storeDescription: "Your trusted destination for the latest Apple products",
    storeEmail: "contact@applestore.com",
    storePhone: "+1 (555) 123-4567",
    currency: "USD",
    timezone: "America/New_York",
    emailNotifications: true,
    orderNotifications: true,
    inventoryAlerts: true,
    maintenanceMode: false,
    allowGuestCheckout: true,
    requireEmailVerification: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const loadSettings = async () => {
    try {
      setLoading(true)
      const backendSettings = await getStoreSettings()
      const frontendSettings = convertToFrontendFormat(backendSettings)
      setSettings(frontendSettings)
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Keep default settings if API fails - don't throw error to prevent crash
      // Just log the error and continue with defaults
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (section: 'general' | 'notifications' | 'security') => {
    try {
      setSaving(section)
      const backendSettings = convertToBackendFormat(settings)
      const response = await updateStoreSettingsSection(section, backendSettings)
      return response
    } catch (error) {
      console.error(`Failed to save ${section} settings:`, error)
      throw error
    } finally {
      setSaving(null)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  return {
    settings,
    loading,
    saving,
    setSettings,
    handleSave,
    loadSettings
  }
}
