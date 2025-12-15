import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const SignUpForm = ({ onSuccess, onSwitchToLogin }) => {
  const { signUp, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const errors = {};

    // Username validation
    if (!formData.username) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 20) {
      errors.username = 'Username must be less than 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password)) {
      errors.password = 'Password must contain uppercase and lowercase letters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
    if (error) {
      clearError();
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

    try {
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        formData.username
      );

      if (signUpError) {
        setFormErrors({
          submit: signUpError.message || 'Failed to sign up. Please try again.'
        });
      } else {
        // Success
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      setFormErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="CoolPlayer123"
          disabled={isSubmitting || isLoading}
          autoComplete="username"
        />
        {formErrors.username && (
          <p className="mt-1 text-sm text-red-400">{formErrors.username}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          3-20 characters, letters, numbers, and underscores only
        </p>
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={`input w-full ${
            formErrors.email ? 'border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder="your.email@example.com"
          disabled={isSubmitting || isLoading}
          autoComplete="email"
        />
        {formErrors.email && (
          <p className="mt-1 text-sm text-red-400">{formErrors.email}</p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className={`input w-full ${
            formErrors.password ? 'border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder="••••••••"
          disabled={isSubmitting || isLoading}
          autoComplete="new-password"
        />
        {formErrors.password && (
          <p className="mt-1 text-sm text-red-400">{formErrors.password}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          At least 6 characters with uppercase and lowercase
        </p>
      </div>

      {/* Confirm Password Field */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className={`input w-full ${
            formErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder="••••••••"
          disabled={isSubmitting || isLoading}
          autoComplete="new-password"
        />
        {formErrors.confirmPassword && (
          <p className="mt-1 text-sm text-red-400">{formErrors.confirmPassword}</p>
        )}
      </div>

      {/* Submit Error */}
      {(formErrors.submit || error) && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
          <p className="text-sm text-red-400">{formErrors.submit || error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || isLoading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting || isLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Creating account...
          </span>
        ) : (
          'Sign Up'
        )}
      </button>

      {/* Switch to Login */}
      {onSwitchToLogin && (
        <div className="text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-ocean-400 hover:text-ocean-300 font-medium"
              disabled={isSubmitting || isLoading}
            >
              Sign In
            </button>
          </p>
        </div>
      )}
    </form>
  );
};

export default SignUpForm;
