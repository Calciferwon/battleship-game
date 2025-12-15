const EmptyState = ({
  icon = '📭',
  title = 'No items found',
  message = 'There are no items to display',
  action = null,
  actionLabel = 'Take Action',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      {/* Icon */}
      <div className="text-6xl mb-4">{icon}</div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {/* Message */}
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {message}
      </p>

      {/* Action Button */}
      {action && (
        <button
          onClick={action}
          className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
