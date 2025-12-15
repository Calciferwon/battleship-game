import { toast } from 'react-toastify';

const useNotification = () => {
  const showSuccess = (message, options = {}) => {
    toast.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  };

  const showError = (message, options = {}) => {
    toast.error(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  };

  const showInfo = (message, options = {}) => {
    toast.info(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  };

  const showWarning = (message, options = {}) => {
    toast.warning(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  };

  // Game-specific notifications
  const gameNotifications = {
    matchFound: () => showSuccess('🎮 Match found! Get ready to battle!'),

    yourTurn: () => showInfo('⚓ Your turn! Make your move!', { autoClose: 2000 }),

    hit: () => showSuccess('🎯 Direct hit!', { autoClose: 2000 }),

    miss: () => showInfo('💨 Miss!', { autoClose: 2000 }),

    shipSunk: (shipName) => showSuccess(`💥 You sunk ${shipName}!`, { autoClose: 3000 }),

    yourShipSunk: (shipName) => showWarning(`⚠️ Your ${shipName} was sunk!`, { autoClose: 3000 }),

    victory: () => showSuccess('🎉 Victory! You won the battle!', { autoClose: 5000 }),

    defeat: () => showError('💀 Defeat! Better luck next time!', { autoClose: 5000 }),

    opponentLeft: () => showWarning('⚠️ Opponent left the game', { autoClose: 5000 }),

    connectionLost: () => showError('❌ Connection lost. Trying to reconnect...', { autoClose: false }),

    reconnected: () => showSuccess('✅ Reconnected to server'),
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    gameNotifications,
  };
};

export default useNotification;
