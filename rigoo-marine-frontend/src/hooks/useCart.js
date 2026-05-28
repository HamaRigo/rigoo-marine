import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { shopApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CART_KEY = ['shop', 'cart'];

export function useCart() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const cartQuery = useQuery({
    queryKey: CART_KEY,
    queryFn: shopApi.getCart,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const setCart = useCallback(
    (cart) => queryClient.setQueryData(CART_KEY, cart),
    [queryClient],
  );

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: CART_KEY }),
    [queryClient],
  );

  const addItem = useMutation({
    mutationFn: ({ productId, quantity = 1 }) => shopApi.addToCart(productId, quantity),
    onSuccess: setCart,
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }) => shopApi.updateCartItem(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
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

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    itemCount: cartQuery.data?.itemCount ?? 0,
    addItem,
    updateItem,
    removeItem,
    refetch: cartQuery.refetch,
  };
}
