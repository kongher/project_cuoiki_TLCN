import shopSettingsModel from '../models/shopSettingsModel.js'

const SETTINGS_KEY = 'global'

export const getShopSettings = async () => {
  let doc = await shopSettingsModel.findOne({ key: SETTINGS_KEY })
  if (!doc) {
    doc = await shopSettingsModel.create({
      key: SETTINGS_KEY,
      lowStockThreshold: 5,
      deadstockDaysMin: 30,
      deadstockDaysMax: 60,
    })
  }
  return doc
}
