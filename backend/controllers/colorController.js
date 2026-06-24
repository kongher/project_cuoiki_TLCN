import colorModel from "../models/colorModel.js";

const normHex = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase();
  const noHash = s.replace(/^#/, "");
  if (/^[0-9A-Fa-f]{6}$/.test(noHash)) return `#${noHash.toUpperCase()}`;
  return "";
};

const DEFAULT_COLORS = [
  { name: "Đen", hex: "#000000", skuCode: "D", sortOrder: 0 },
  { name: "Xanh Navy (Than)", hex: "#1A237E", skuCode: "NV", sortOrder: 10 },
  { name: "Xám (Ghi)", hex: "#9E9E9E", skuCode: "GY", sortOrder: 20 },
  { name: "Đỏ đô", hex: "#880E4F", skuCode: "RE", sortOrder: 30 },
  { name: "Vàng", hex: "#FFEB3B", skuCode: "YE", sortOrder: 40 },
  { name: "Xanh nước biển", hex: "#03A9F4", skuCode: "BU", sortOrder: 50 },
  { name: "Kem/Be", hex: "#F5F5DC", skuCode: "BE", sortOrder: 60 },
  { name: "Nâu", hex: "#5D4037", skuCode: "BR", sortOrder: 70 }
];

export const ensureDefaultColors = async () => {
  const count = await colorModel.countDocuments();
  if (count > 0) return;
  await colorModel.insertMany(DEFAULT_COLORS);
};

export const listColorsForSelect = async (req, res) => {
  try {
    await ensureDefaultColors();
    const colors = await colorModel
      .find({ isActive: { $ne: false } })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    res.json({ success: true, colors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const adminListColors = async (req, res) => {
  try {
    await ensureDefaultColors();
    const colors = await colorModel.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ success: true, colors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// admin them màu sắc 
export const adminAddColor = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const hex = normHex(req.body?.hex);
    const skuCode = String(req.body?.skuCode || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!name) return res.json({ success: false, message: "Thiếu tên màu" });
    if (!hex) return res.json({ success: false, message: "Mã hex không hợp lệ" });
    if (!skuCode) return res.json({ success: false, message: "Mã viết tắt SKU không hợp lệ" });

    const doc = await colorModel.create({
      name,
      hex,
      skuCode,
      sortOrder: Number(req.body?.sortOrder) || 0,
      isActive: req.body?.isActive === false || req.body?.isActive === "false" ? false : true
    });
    res.json({ success: true, message: "Đã thêm màu", color: doc });
  } catch (error) {
    if (error?.code === 11000) {
      return res.json({ success: false, message: "Trùng mã hex hoặc mã viết tắt (SKU Code)" });
    }
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const adminUpdateColor = async (req, res) => {
  try {
    const id = req.body?.id;
    if (!id) return res.json({ success: false, message: "Thiếu id" });

    const patch = {};
    if (req.body?.name !== undefined) patch.name = String(req.body.name).trim();
    if (req.body?.hex !== undefined) {
      const h = normHex(req.body.hex);
      if (!h) return res.json({ success: false, message: "Mã hex không hợp lệ" });
      patch.hex = h;
    }
    if (req.body?.skuCode !== undefined) {
      const c = String(req.body.skuCode)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      if (!c) return res.json({ success: false, message: "Mã viết tắt không hợp lệ" });
      patch.skuCode = c;
    }
    if (req.body?.sortOrder !== undefined) patch.sortOrder = Number(req.body.sortOrder) || 0;
    if (req.body?.isActive !== undefined) {
      patch.isActive = req.body.isActive === false || req.body.isActive === "false" ? false : true;
    }

    const updated = await colorModel.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) return res.json({ success: false, message: "Không tìm thấy màu" });
    res.json({ success: true, message: "Đã cập nhật", color: updated });
  } catch (error) {
    if (error?.code === 11000) {
      return res.json({ success: false, message: "Trùng mã hex hoặc mã viết tắt" });
    }
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const adminRemoveColor = async (req, res) => {
  try {
    const id = req.body?.id;
    if (!id) return res.json({ success: false, message: "Thiếu id" });
    await colorModel.findByIdAndDelete(id);
    res.json({ success: true, message: "Đã xóa" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
