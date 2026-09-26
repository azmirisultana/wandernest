import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Check, AlertCircle, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthModal({ isOpen, onClose, initialSignUp = false }) {
  const { loginWithGoogle, loginWithEmail, signupWithEmail, authError } = useAuth();
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState('');

  // Crucial: Clear all fields when modal opens or mode toggles so it is NEVER prefilled!
  useEffect(() => {
    setIsSignUp(initialSignUp);
    setFullName('');
    setEmail('');
    setPassword('');
    setLocalErr('');
  }, [initialSignUp, isOpen]);

  if (!isOpen) return null;

  // Password criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isValidPassword = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passedCriteria = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  
  let strengthLabel = 'Weak';
  let strengthColor = 'bg-rose-500';
  if (passedCriteria >= 4 && isValidPassword) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500';
  } else if (passedCriteria >= 3) {
    strengthLabel = 'Good';
    strengthColor = 'bg-amber-500';
  } else if (passedCriteria >= 2) {
    strengthLabel = 'Fair';
    strengthColor = 'bg-orange-500';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setLocalErr('Please enter your email address.');
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setLocalErr('Please enter your full name.');
      return;
    }

    if (isSignUp && !isValidPassword) {
      setLocalErr('Please satisfy all password security requirements.');
      return;
    }

    setLocalErr('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signupWithEmail(email, password, fullName);
      } else {
        await loginWithEmail(email, password);
      }
      onClose();
    } catch (err) {
      setLocalErr(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      setLocalErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#EBE7DF] overflow-hidden text-[#141413] animate-slide-up"
        style={{ transition: 'transform 200ms ease' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-mutedText hover:text-[#141413] hover:bg-[#FAF8F5] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-8 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#141413] text-[#C24B27] mb-3 shadow-xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-6 h-6">
              <path d="M50 15 Q50 50 85 50 Q50 50 50 85 Q50 50 15 50 Q50 50 50 15 Z" fill="#C24B27" />
              <circle cx="50" cy="50" r="5" fill="#FAF8F5" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#141413]">
            {isSignUp ? 'Create your travel workspace' : 'Welcome to WanderNest'}
          </h2>
          <p className="text-xs text-mutedText mt-1">
            Build multi-day journeys, sync interactive maps, and explore 360° street views.
          </p>
        </div>

        {/* Modal Body */}
        <div className="px-8 pb-8 space-y-4">
          {(localErr || authError) && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{localErr || authError}</span>
            </div>
          )}

          {/* Google Sign-in */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#EBE7DF] bg-white hover:bg-[#FAF8F5] text-[#141413] font-semibold text-xs transition-all shadow-2xs active:scale-[0.99]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-[#EBE7DF] w-full" />
            <span className="bg-white px-3 text-[10px] font-bold text-mutedText uppercase tracking-wider">or with email</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-mutedText mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-mutedText" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="e.g. Sarah Traveler"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] focus:outline-none focus:border-[#C24B27] text-xs font-medium text-[#141413]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-mutedText mb-1">Email or Username</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-mutedText" />
                <input
                  type="text"
                  inputMode="email"
                  required
                  autoComplete="off"
                  placeholder="traveler@wandernest.local or test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] focus:outline-none focus:border-[#C24B27] text-xs font-medium text-[#141413]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-mutedText mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-mutedText" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] focus:outline-none focus:border-[#C24B27] text-xs font-medium text-[#141413]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-mutedText hover:text-[#141413]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password checklist (on signup) */}
            {isSignUp && (
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EBE7DF] space-y-2 text-[11px]">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-mutedText">Password Strength:</span>
                  <span className={passedCriteria >= 4 ? 'text-emerald-600' : 'text-amber-600'}>{strengthLabel}</span>
                </div>
                <div className="w-full h-1.5 bg-[#EBE7DF] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strengthColor} transition-all duration-300`}
                    style={{ width: `${(passedCriteria / 5) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-mutedText">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-semibold' : ''}`}>
                    <Check className={`w-3 h-3 ${hasMinLength ? 'opacity-100' : 'opacity-30'}`} />
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 font-semibold' : ''}`}>
                    <Check className={`w-3 h-3 ${hasUppercase ? 'opacity-100' : 'opacity-30'}`} />
                    <span>1 uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-600 font-semibold' : ''}`}>
                    <Check className={`w-3 h-3 ${hasLowercase ? 'opacity-100' : 'opacity-30'}`} />
                    <span>1 lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-semibold' : ''}`}>
                    <Check className={`w-3 h-3 ${hasNumber ? 'opacity-100' : 'opacity-30'}`} />
                    <span>1 number</span>
                  </div>
                  <div className={`flex items-center gap-1.5 col-span-2 ${hasSpecial ? 'text-emerald-600 font-semibold' : ''}`}>
                    <Check className={`w-3 h-3 ${hasSpecial ? 'opacity-100' : 'opacity-30'}`} />
                    <span>1 symbol (!@#$%^&*)</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-full bg-[#141413] hover:bg-[#C24B27] text-white font-bold text-xs transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{isSignUp ? 'Create Workspace Account' : 'Sign In'}</span>
              )}
            </button>
          </form>

          {/* Switch mode note (Strictly NO guest button!) */}
          <div className="pt-2 text-center">
            <p className="text-xs text-mutedText">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setLocalErr(''); }}
                className="font-bold text-[#C24B27] hover:underline ml-1"
              >
                {isSignUp ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
