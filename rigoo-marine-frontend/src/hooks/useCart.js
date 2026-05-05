import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CART_KEY = ['shop', 'cart'];

/**
 * Cart hook — server-authoritative cart for authenticated users.
 * Returns the live cart query plus optimistic mutations for add/update/remove.
 *
 * Locked decision: login-gated cart, no anonymous cart in v1.
 */
export function useCart() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const cartQuery = useQuery({
    queryKey: CART_KEY,
    queryFn: shopApi.getCart,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const setCart = (cart) => queryClient.setQueryData(CART_KEY, cart);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: CART_KEY });

  const addItem = useMutation({
    mutationFn: ({ productId, quantity = 1 }) => shopApi.addToCart(productId, quantity),
    onSuccess: setCart,
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }) => shopApi.updateCartItem(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      // Optimistic update — instant UI response.
      await queryClient.cancelQueries({ queryKey: CART_KEY });
      const prev = queryClient.getQueryData(CART_KEY);
      if (prev) {
        queryClient.setQueryData(CART_KEY, {
          ...prev,
          items: prev.items.map((it) => (it.id === itemId ? { ...it, quantity } : it)),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(CART_KEY, ctx.prev);
    },
    onSettled: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: (itemId) => shopApi.removeCartItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: CART_KEY });
      const prev = queryClient.getQueryData(CART_KEY);
      if (prev) {
        queryClient.setQueryData(CART_KEY, {
          ...prev,
          items: prev.items.filter((it) => it.id !== itemId),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(CART_KEY, ctx.prev);
    },
    onSettled: invalidate,
  });

  const itemCount = cartQuery.data?.itemCount ?? 0;

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    itemCount,
    addItem,
    updateItem,
    removeItem,
    refetch: cartQuery.refetch,
  };
}
