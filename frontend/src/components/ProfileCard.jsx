import { useAuth } from '../hooks/useAuth';

const ProfileCard = ({ profile, isOwnProfile = false, onEditClick }) => {
  if (!profile) {
    return (
      <div className="card animate-pulse">
        <div className="h-8 bg-navy-700 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-navy-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-navy-700 rounded w-2/3"></div>
      </div>
    );
  }

  const winRate = profile.games_played > 0
    ? ((profile.wins / profile.games_played) * 100).toFixed(1)
    : 0;

  const getAvatarUrl = (url) => {
    if (!url) return null;
    // If it's already a full URL, return it
    if (url.startsWith('http')) return url;
    // Otherwise, construct the Supabase storage URL
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${url}`;
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={getAvatarUrl(profile.avatar_url)}
                alt={`${profile.username}'s avatar`}
                className="w-20 h-20 rounded-full object-cover border-2 border-ocean-500"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=0066cc&color=fff&size=200`;
                }}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-ocean-500 flex items-center justify-center text-2xl font-bold text-white border-2 border-ocean-400">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-navy-800"></div>
          </div>

          {/* User Info */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {profile.username}
            </h2>
            <p className="text-sm text-gray-400">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Edit Button (only for own profile) */}
        {isOwnProfile && onEditClick && (
          <button
            onClick={onEditClick}
            className="btn-secondary flex items-center space-x-2"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-4 bg-navy-700 rounded-lg">
          <p className="text-3xl font-bold text-green-400">{profile.wins}</p>
          <p className="text-sm text-gray-400 mt-1">Wins</p>
        </div>
        <div className="text-center p-4 bg-navy-700 rounded-lg">
          <p className="text-3xl font-bold text-red-400">{profile.losses}</p>
          <p className="text-sm text-gray-400 mt-1">Losses</p>
        </div>
        <div className="text-center p-4 bg-navy-700 rounded-lg">
          <p className="text-3xl font-bold text-ocean-400">{profile.games_played}</p>
          <p className="text-sm text-gray-400 mt-1">Total Games</p>
        </div>
        <div className="text-center p-4 bg-navy-700 rounded-lg">
          <p className="text-3xl font-bold text-yellow-400">{winRate}%</p>
          <p className="text-sm text-gray-400 mt-1">Win Rate</p>
        </div>
      </div>

      {/* Win/Loss Ratio Bar */}
      {profile.games_played > 0 && (
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Win/Loss Ratio</span>
            <span>{profile.wins}W - {profile.losses}L</span>
          </div>
          <div className="w-full h-3 bg-navy-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{
                width: `${winRate}%`
              }}
            ></div>
          </div>
        </div>
      )}

      {/* No Games Yet */}
      {profile.games_played === 0 && (
        <div className="mt-6 text-center py-4 bg-navy-700 rounded-lg">
          <p className="text-gray-400">No games played yet</p>
          <p className="text-sm text-gray-500 mt-1">Start your first battle!</p>
        </div>
      )}
    </div>
  );
};

export default ProfileCard;
