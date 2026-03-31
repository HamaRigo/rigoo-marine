import toast from 'react-hot-toast';

/**
 * Custom hook for common toast patterns
 * @returns {Object} Toast helper functions
 *
 * @example
 * const { success, error, loading, promise } = useToast();
 *
 * // Show success toast
 * success('Operation completed!');
 *
 * // Show error toast
 * error('Something went wrong');
 *
 * // Show loading toast
 * const loadingId = loading('Processing...');
 * toast.dismiss(loadingId);
 *
 * // Handle promise with toasts
 * promise(
 *   apiCall(),
 *   {
 *     loading: 'Saving...',
 *     success: 'Saved successfully!',
 *     error: 'Failed to save',
 *   }
 * );
 */
export function useToast() {
  const success = (message, duration = 4000) => {
    toast.success(message, { duration });
  };

  const error = (message, duration = 6000) => {
    toast.error(message, { duration });
  };

  const loading = (message) => {
    return toast.loading(message);
  };

  const info = (message, duration = 4000) => {
    toast(message, { duration, icon: 'ℹ️' });
  };

  const promise = async (promise, messages) => {
    try {
      const result = await toast.promise(promise, {
        loading: messages.loading || 'Loading...',
        success: messages.success || 'Success!',
        error: messages.error || 'Error occurred',
      });
      return result;
    } catch (err) {
      throw err;
    }
  };

  const dismiss = (toastId) => {
    toast.dismiss(toastId);
  };

  return { success, error, loading, info, promise, dismiss };
}

export default useToast;
