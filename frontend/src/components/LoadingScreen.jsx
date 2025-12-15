import LoadingSpinner from './LoadingSpinner';

const LoadingScreen = ({ text = 'Loading...', fullScreen = true }) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-gray-900 z-50">
        <div className="text-center">
          {/* Animated Ship Icon */}
          <div className="mb-8 animate-bounce">
            <svg
              className="w-24 h-24 mx-auto text-primary-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 19h12v2H6v-2zm6-16v12H4l8-16 8 16h-8V3zm-6 14h12l-6-12-6 12z" />
            </svg>
          </div>

          <LoadingSpinner size="xl" />

          <p className="mt-6 text-xl font-semibold text-white">{text}</p>

          {/* Animated Dots */}
          <div className="flex justify-center gap-2 mt-4">
            <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
};

export default LoadingScreen;
