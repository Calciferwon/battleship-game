import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

const EditProfileModal = ({ isOpen, onClose, onSuccess }) => {
  const { profile, updateProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    username: profile?.username || '',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const validateForm = () => {
    const errors = {};

    if (!formData.username) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 20) {
      errors.username = 'Username must be less than 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setFormErrors({ avatar: 'Please select an image file' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFormErrors({ avatar: 'Image must be less than 2MB' });
      return;
    }

    setAvatarFile(file);
    setFormErrors({ ...formErrors, avatar: '' });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (userId) => {
    if (!avatarFile) return null;

    try {
      // Create unique filename
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      return fileName;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});
    setUploadProgress(0);

    try {
      const updates = {};

      // Check if username changed
      if (formData.username !== profile.username) {
        updates.username = formData.username;
      }

      // Upload avatar if selected
      if (avatarFile) {
        setUploadProgress(30);
        const avatarPath = await uploadAvatar(profile.id);
        updates.avatar_url = avatarPath;
        setUploadProgress(60);
      }

      // Update profile if there are changes
      if (Object.keys(updates).length > 0) {
        setUploadProgress(80);
        const { error } = await updateProfile(updates);

        if (error) {
          // Check for unique constraint violation
          if (error.code === '23505' || error.message.includes('unique')) {
            setFormErrors({ username: 'Username already taken' });
            setIsSubmitting(false);
            setUploadProgress(0);
            return;
          }
          throw error;
        }

        setUploadProgress(100);

        // Success
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        // No changes made
        onClose();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setFormErrors({ submit: error.message || 'Failed to update profile' });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const getCurrentAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (profile?.avatar_url) {
      if (profile.avatar_url.startsWith('http')) return profile.avatar_url;
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="card w-full max-w-md mx-4 relative animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Edit Profile</h2>
          <p className="text-gray-400">Update your profile information</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="text-center">
            <div className="flex flex-col items-center">
              {/* Avatar Preview */}
              <div className="relative mb-4">
                {getCurrentAvatarUrl() ? (
                  <img
                    src={getCurrentAvatarUrl()}
                    alt="Avatar preview"
                    className="w-24 h-24 rounded-full object-cover border-4 border-ocean-500"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || 'User')}&background=0066cc&color=fff&size=200`;
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-ocean-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-ocean-400">
                    {(formData.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="absolute bottom-0 right-0 bg-ocean-500 hover:bg-ocean-600 text-white p-2 rounded-full shadow-lg transition-colors disabled:opacity-50"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />

              <p className="text-xs text-gray-500">
                Click the camera icon to change your avatar
                <br />
                Max size: 2MB
              </p>

              {formErrors.avatar && (
                <p className="mt-2 text-sm text-red-400">{formErrors.avatar}</p>
              )}
            </div>
          </div>

          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`input w-full ${
                formErrors.username ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              placeholder="YourUsername"
              disabled={isSubmitting}
              autoComplete="username"
            />
            {formErrors.username && (
              <p className="mt-1 text-sm text-red-400">{formErrors.username}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>

          {/* Upload Progress */}
          {isSubmitting && uploadProgress > 0 && (
            <div>
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Updating profile...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-navy-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ocean-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Submit Error */}
          {formErrors.submit && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
              <p className="text-sm text-red-400">{formErrors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
