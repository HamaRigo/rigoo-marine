import { Toaster } from 'react-hot-toast';

/**
 * Global toast notification provider
 * Wrap this at the root of your application
 *
 * Usage in components:
 * import toast from 'react-hot-toast';
 *
 * toast.success('Operation completed!');
 * toast.error('Something went wrong');
 * toast.loading('Processing...');
 * toast.custom((t) => <CustomToast t />);
 */
export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 5000,
        style: {
          background: '#363636',
          color: '#fff',
          borderRadius: 8,
          fontSize: 14,
        },
        success: {
          duration: 4000,
          iconTheme: {
            primary: '#4ade80',
            secondary: '#fff',
          },
        },
        error: {
          duration: 6000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
        loading: {
          duration: Infinity,
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}
