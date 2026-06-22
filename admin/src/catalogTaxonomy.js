/** Taxonomy Admin — đồng bộ với frontend/src/config/catalogTaxonomy.js */
export const CATALOG_LEAVES = [
  { slug: 'nam-ao-thun', label: 'Nam · Áo · Thun', category: 'Men', subCategory: 'Topwear' },
  { slug: 'nam-ao-so-mi', label: 'Nam · Áo · Sơ mi', category: 'Men', subCategory: 'Topwear' },
  { slug: 'nam-ao-polo', label: 'Nam · Áo · Polo', category: 'Men', subCategory: 'Topwear' },
  { slug: 'nam-ao-khoac-gio', label: 'Nam · Áo khoác · Áo khoác gió', category: 'Men', subCategory: 'Outerwear' },
  { slug: 'nam-ao-khoac-jean', label: 'Nam · Áo khoác · Áo khoác Jean', category: 'Men', subCategory: 'Outerwear' },
  { slug: 'nam-ao-khoac-phao', label: 'Nam · Áo khoác · Áo khoác phao', category: 'Men', subCategory: 'Outerwear' },
  { slug: 'nam-quan-jean', label: 'Nam · Quần · Jean', category: 'Men', subCategory: 'Bottomwear' },
  { slug: 'nam-quan-short', label: 'Nam · Quần · Short', category: 'Men', subCategory: 'Bottomwear' },
  { slug: 'nam-quan-tay', label: 'Nam · Quần · Tây', category: 'Men', subCategory: 'Bottomwear' },
  { slug: 'nu-ao-so-mi', label: 'Nữ · Áo · Áo sơ mi', category: 'Women', subCategory: 'Topwear' },
  { slug: 'nu-ao-thun', label: 'Nữ · Áo · Áo thun', category: 'Women', subCategory: 'Topwear' },
  { slug: 'nu-ao-khoac', label: 'Nữ · Áo · Áo khoác', category: 'Women', subCategory: 'Topwear' },
  { slug: 'nu-quan-jean', label: 'Nữ · Quần · Quần jean', category: 'Women', subCategory: 'Bottomwear' },
  { slug: 'nu-quan-short', label: 'Nữ · Quần · Quần short', category: 'Women', subCategory: 'Bottomwear' },
  { slug: 'nu-quan-vay', label: 'Nữ · Quần · Váy', category: 'Women', subCategory: 'Bottomwear' },
  { slug: 'nu-vay', label: 'Nữ · Váy · Váy liền', category: 'Women', subCategory: 'Dresswear' },
  { slug: 'nu-vay-dam', label: 'Nữ · Váy · Đầm váy', category: 'Women', subCategory: 'Dresswear' },
  { slug: 'tre-ao', label: 'Trẻ em · Áo', category: 'Kids', subCategory: 'Topwear' },
  { slug: 'tre-quan', label: 'Trẻ em · Quần', category: 'Kids', subCategory: 'Bottomwear' },
  { slug: 'tre-bo', label: 'Trẻ em · Bộ đồ', category: 'Kids', subCategory: 'Topwear' },
  { slug: 'tre-phu-kien', label: 'Trẻ em · Phụ kiện', category: 'Kids', subCategory: 'Winterwear' }
]

export const catalogLeavesForCategoryAndSub = (category, subCategory) =>
  CATALOG_LEAVES.filter((l) => l.category === category && l.subCategory === subCategory)

/** Chuẩn hóa subCategory cũ (Winterwear Nam) → Outerwear */
export const normalizeSubCategory = (category, subCategory) => {
  if (category === 'Men' && subCategory === 'Winterwear') return 'Outerwear'
  return subCategory
}
