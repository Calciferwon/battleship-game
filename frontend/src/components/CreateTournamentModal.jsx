import { useState } from 'react';
import useTournamentStore from '../stores/tournamentStore';
import LoadingSpinner from './LoadingSpinner';

const CreateTournamentModal = ({ onClose, onSuccess }) => {
  const { createTournament, isLoading, error, clearError } = useTournamentStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxPlayers: 8,
    useCustomPlayers: false,
    customPlayers: '',
    registrationEndsAt: '',
  });

  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Tournament name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      errors.name = 'Name must be less than 50 characters';
    }

    if (formData.description && formData.description.length > 200) {
      errors.description = 'Description must be less than 200 characters';
    }

    if (formData.registrationEndsAt) {
      const deadline = new Date(formData.registrationEndsAt);
      const now = new Date();
      if (deadline <= now) {
        errors.registrationEndsAt = 'Registration deadline must be in the future';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    // Validate form
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      let maxPlayers = formData.useCustomPlayers 
        ? parseInt(formData.customPlayers) 
        : parseInt(formData.maxPlayers);

      // Validate custom players
      if (formData.useCustomPlayers) {
        if (!formData.customPlayers || isNaN(maxPlayers)) {
          setFormErrors({ customPlayers: 'Please enter a valid number' });
          return;
        }
        if (maxPlayers < 2 || maxPlayers > 128) {
          setFormErrors({ customPlayers: 'Players must be between 2 and 128' });
          return;
        }
      }

      const tournament = await createTournament({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        maxPlayers: maxPlayers,
        registrationEndsAt: formData.registrationEndsAt || null,
      });

      onSuccess(tournament);
    } catch (err) {
      console.error('Failed to create tournament:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-navy-800 rounded-lg max-w-md w-full p-6 border border-navy-700">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Create Tournament</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tournament Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Tournament Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter tournament name"
              className={`w-full px-4 py-2 bg-navy-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                formErrors.name
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-navy-700 focus:ring-blue-500'
              }`}
              maxLength={50}
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-400">{formErrors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add a description..."
              rows={3}
              className={`w-full px-4 py-2 bg-navy-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 resize-none ${
                formErrors.description
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-navy-700 focus:ring-blue-500'
              }`}
              maxLength={200}
            />
            {formErrors.description && (
              <p className="mt-1 text-sm text-red-400">{formErrors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.description.length}/200 characters
            </p>
          </div>

          {/* Max Players */}
          <div>
            <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-300 mb-2">
              Maximum Players *
            </label>
            
            <div className="space-y-3">
              <div>
                <label className="flex items-center text-sm text-gray-300 mb-2">
                  <input
                    type="radio"
                    name="playerType"
                    value="preset"
                    checked={!formData.useCustomPlayers}
                    onChange={() => setFormData((prev) => ({ ...prev, useCustomPlayers: false }))}
                    className="mr-2"
                  />
                  Preset sizes
                </label>
                {!formData.useCustomPlayers && (
                  <select
                    id="maxPlayers"
                    name="maxPlayers"
                    value={formData.maxPlayers}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={4}>4 Players</option>
                    <option value={8}>8 Players</option>
                    <option value={16}>16 Players</option>
                    <option value={32}>32 Players</option>
                  </select>
                )}
              </div>

              <div>
                <label className="flex items-center text-sm text-gray-300 mb-2">
                  <input
                    type="radio"
                    name="playerType"
                    value="custom"
                    checked={formData.useCustomPlayers}
                    onChange={() => setFormData((prev) => ({ ...prev, useCustomPlayers: true }))}
                    className="mr-2"
                  />
                  Custom number (2-128)
                </label>
                {formData.useCustomPlayers && (
                  <input
                    type="number"
                    name="customPlayers"
                    value={formData.customPlayers}
                    onChange={handleChange}
                    min="2"
                    max="128"
                    placeholder="Enter number of players"
                    className="w-full px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Tournament can start with fewer players than maximum
            </p>
          </div>

          {/* Registration Deadline (Optional) */}
          <div>
            <label
              htmlFor="registrationEndsAt"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Registration Deadline (Optional)
            </label>
            <input
              type="datetime-local"
              id="registrationEndsAt"
              name="registrationEndsAt"
              value={formData.registrationEndsAt}
              onChange={handleChange}
              className={`w-full px-4 py-2 bg-navy-900 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                formErrors.registrationEndsAt
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-navy-700 focus:ring-blue-500'
              }`}
            />
            {formErrors.registrationEndsAt && (
              <p className="mt-1 text-sm text-red-400">{formErrors.registrationEndsAt}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Leave blank for no deadline
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-navy-700 text-white rounded-lg hover:bg-navy-600 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Creating...</span>
                </span>
              ) : (
                'Create Tournament'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTournamentModal;
