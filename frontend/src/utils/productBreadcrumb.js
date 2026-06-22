import { DEPARTMENTS, getLeafBySlug } from '../config/catalogTaxonomy'

/** Trang chủ > [Cấp 1: Nam/Nữ/...] > [Cấp 2: nhóm danh mục] > [Tên SP] */
export function getProductBreadcrumb(product) {
  if (!product) return []

  const category = String(product.category || '').trim()
  const dept = DEPARTMENTS.find((d) => d.id === category)
  const deptLabel = dept?.label || category || 'Danh mục'
  const leaf = product.catalogSlug ? getLeafBySlug(product.catalogSlug) : null

  const crumbs = [
    { label: 'Trang chủ', to: '/' },
    {
      label: deptLabel,
      to: category ? `/collection?dept=${encodeURIComponent(category)}` : '/collection',
    },
  ]

  if (leaf) {
    crumbs.push({
      label: leaf.groupLabel,
      to: `/collection?dept=${encodeURIComponent(category)}&group=${encodeURIComponent(leaf.groupId)}`,
    })
  } else if (product.subCategory && dept) {
    const group = dept.groups.find((g) =>
      g.items.some((i) => i.subCategory === product.subCategory)
    )
    if (group) {
      crumbs.push({
        label: group.label,
        to: `/collection?dept=${encodeURIComponent(category)}&group=${encodeURIComponent(group.id)}`,
      })
    }
  }

  crumbs.push({ label: String(product.name || '').trim() || 'Sản phẩm', to: null })
  return crumbs
}
