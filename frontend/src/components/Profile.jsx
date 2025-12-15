import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import ProfileCard from './ProfileCard';
import EditProfileModal from './EditProfileModal';
import UserStats from './UserStats';
import GameHistory from './GameHistory';

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'history'

  // Determine if this is the current user's profile
  const isOwnProfile = user && (userId === user.id || !userId);
  const profileToDisplay = isOwnProfile ? currentUserProfile : profile;
  const userIdToFetch = userId || user?.id;

  useEffect(() => {
    if (userIdToFetch) {
      fetchProfile(userIdToFetch);
    } else {
      setIsLoading(false);
      setError('No user ID provided');
    }
  }, [userIdToFetch]);

  const fetchProfile = async (id) => {
    try {
      setIsLoading(true);
      setError(null);

      // If it's the current user's profile, we already have it
      if (isOwnProfile && currentUserProfile) {
        setProfile(currentUserProfile);
        setIsLoading(false);
        return;
      }

      // Fetch profile from Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Profile not found');
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSuccess = () => {
    // Refresh profile after edit
    if (userIdToFetch) {
      fetchProfile(userIdToFetch);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocean-500 mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Profile Not Found</h1>
          <p className="text-gray-400 mb-8">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!profileToDisplay) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">No Profile</h1>
          <p className="text-gray-400 mb-8">Please sign in to view your profile</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Header */}
      <header className="bg-navy-800 border-b border-navy-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Back to Home</span>
            </button>

            <h1 className="text-xl font-bold text-white">
              {isOwnProfile ? 'Your Profile' : `${profileToDisplay.username}'s Profile`}
            </h1>

            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Card */}
          <ProfileCard
            profile={profileToDisplay}
            isOwnProfile={isOwnProfile}
            onEditClick={() => setShowEditModal(true)}
          />

          {/* Tab Navigation */}
          <div className="bg-navy-800 rounded-lg border border-navy-700">
            <div className="flex border-b border-navy-700">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-3 px-4 font-semibold transition-colors ${
                  activeTab === 'overview'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-3 px-4 font-semibold transition-colors ${
                  activeTab === 'history'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Game History
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && <UserStats userId={userIdToFetch} />}
              {activeTab === 'history' && <GameHistory userId={userIdToFetch} />}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default Profile;
