/**
 * Danh mục cha–con (Navbar + Collection + Admin).
 * subCategory: Topwear | Bottomwear | Outerwear | Dresswear | Winterwear (Kids phụ kiện).
 */
export const CATALOG_LEAVES = [
  // —— Nam ——
  { slug: 'nam-ao-thun', label: 'Thun', category: 'Men', subCategory: 'Topwear', groupId: 'nam-ao', groupLabel: 'Áo' },
  { slug: 'nam-ao-so-mi', label: 'Sơ mi', category: 'Men', subCategory: 'Topwear', groupId: 'nam-ao', groupLabel: 'Áo' },
  { slug: 'nam-ao-polo', label: 'Polo', category: 'Men', subCategory: 'Topwear', groupId: 'nam-ao', groupLabel: 'Áo' },
  { slug: 'nam-ao-khoac-gio', label: 'Áo khoác gió', category: 'Men', subCategory: 'Outerwear', groupId: 'nam-khoac', groupLabel: 'Áo khoác' },
  { slug: 'nam-ao-khoac-jean', label: 'Áo khoác Jean', category: 'Men', subCategory: 'Outerwear', groupId: 'nam-khoac', groupLabel: 'Áo khoác' },
  { slug: 'nam-ao-khoac-phao', label: 'Áo khoác phao', category: 'Men', subCategory: 'Outerwear', groupId: 'nam-khoac', groupLabel: 'Áo khoác' },
  { slug: 'nam-quan-jean', label: 'Jean', category: 'Men', subCategory: 'Bottomwear', groupId: 'nam-quan', groupLabel: 'Quần' },
  { slug: 'nam-quan-short', label: 'Short', category: 'Men', subCategory: 'Bottomwear', groupId: 'nam-quan', groupLabel: 'Quần' },
  { slug: 'nam-quan-tay', label: 'Tây', category: 'Men', subCategory: 'Bottomwear', groupId: 'nam-quan', groupLabel: 'Quần' },
  // —— Nữ ——
  { slug: 'nu-ao-so-mi', label: 'Áo sơ mi', category: 'Women', subCategory: 'Topwear', groupId: 'nu-ao', groupLabel: 'Áo' },
  { slug: 'nu-ao-thun', label: 'Áo thun', category: 'Women', subCategory: 'Topwear', groupId: 'nu-ao', groupLabel: 'Áo' },
  { slug: 'nu-ao-khoac', label: 'Áo khoác', category: 'Women', subCategory: 'Topwear', groupId: 'nu-ao', groupLabel: 'Áo' },
  { slug: 'nu-quan-jean', label: 'Quần jean', category: 'Women', subCategory: 'Bottomwear', groupId: 'nu-quan', groupLabel: 'Quần' },
  { slug: 'nu-quan-short', label: 'Quần short', category: 'Women', subCategory: 'Bottomwear', groupId: 'nu-quan', groupLabel: 'Quần' },
  { slug: 'nu-quan-vay', label: 'Váy', category: 'Women', subCategory: 'Bottomwear', groupId: 'nu-quan', groupLabel: 'Quần' },
  { slug: 'nu-vay', label: 'Váy', category: 'Women', subCategory: 'Dresswear', groupId: 'nu-vay', groupLabel: 'Váy' },
  { slug: 'nu-vay-dam', label: 'Đầm váy', category: 'Women', subCategory: 'Dresswear', groupId: 'nu-vay', groupLabel: 'Váy' },
  // —— Trẻ em ——
  { slug: 'tre-ao', label: 'Áo trẻ em', category: 'Kids', subCategory: 'Topwear', groupId: 'tre-ao', groupLabel: 'Áo' },
  { slug: 'tre-quan', label: 'Quần trẻ em', category: 'Kids', subCategory: 'Bottomwear', groupId: 'tre-quan', groupLabel: 'Quần' },
  { slug: 'tre-bo', label: 'Bộ đồ', category: 'Kids', subCategory: 'Topwear', groupId: 'tre-bo', groupLabel: 'Bộ đồ' },
  { slug: 'tre-phu-kien', label: 'Phụ kiện', category: 'Kids', subCategory: 'Winterwear', groupId: 'tre-phu-kien', groupLabel: 'Phụ kiện' }
]

/** Slug cũ vẫn lọc được trên Collection */
export const LEGACY_CATALOG_SLUG_ALIASES = {
  'nam-ao-khoac': 'nam-ao-khoac-gio',
  'nam-ao-phao': 'nam-ao-khoac-phao',
}

export const catalogLeavesForCategoryAndSub = (category, subCategory) =>
  CATALOG_LEAVES.filter((l) => l.category === category && l.subCategory === subCategory)

export const DEPARTMENTS = ['Men', 'Women', 'Kids'].map((id) => {
  const leaves = CATALOG_LEAVES.filter((l) => l.category === id)
  const groupMap = new Map()
  leaves.forEach((l) => {
    if (!groupMap.has(l.groupId)) {
      groupMap.set(l.groupId, { id: l.groupId, label: l.groupLabel, items: [] })
    }
    groupMap.get(l.groupId).items.push(l)
  })
  return {
    id,
    label: id === 'Men' ? 'Nam' : id === 'Women' ? 'Nữ' : 'Trẻ em',
    groups: Array.from(groupMap.values())
  }
})

export const getLeafBySlug = (slug) => {
  const key = LEGACY_CATALOG_SLUG_ALIASES[slug] || slug
  return CATALOG_LEAVES.find((l) => l.slug === key) || CATALOG_LEAVES.find((l) => l.slug === slug)
}

export const getLeavesForDepartment = (deptId) => CATALOG_LEAVES.filter((l) => l.category === deptId)
