import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, default: '', sparse: true },
    phone: { type: String, default: '', unique: true, sparse: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    dob: { type: String, default: '' },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isBlocked: { type: Boolean, default: false },
    membershipTier: { type: String, enum: ['standard', 'vip'], default: 'standard' },
    rewardPoints: { type: Number, default: 0 },
    cartData: { type: Object, default: {} },
    avatar: { type: String, default: '' },
    defaultAddress: {
        fullName: { type: String, default: '' },
        phone: { type: String, default: '' },
        address: { type: String, default: '' },
        province: { type: String, default: '' },
        district: { type: String, default: '' },
        ward: { type: String, default: '' }
    }
}, { minimize: false, timestamps: true })

userSchema.index({ email: 1 }, { unique: true, sparse: true, partialFilterExpression: { email: { $type: 'string', $ne: '' } } })

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel
