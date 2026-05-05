package com.rigoomarine.shop.service;

import com.rigoomarine.shop.dto.CartDTO;
import com.rigoomarine.shop.dto.CartItemDTO;
import com.rigoomarine.shop.entity.Cart;
import com.rigoomarine.shop.entity.CartItem;
import com.rigoomarine.shop.entity.Product;
import com.rigoomarine.shop.repository.CartItemRepository;
import com.rigoomarine.shop.repository.CartRepository;
import com.rigoomarine.shop.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public CartDTO getCart(String userEmail) {
        Cart cart = cartRepository.findByUserEmail(userEmail).orElse(null);
        return cart == null ? emptyCart(userEmail) : toDTO(cart);
    }

    public CartDTO addItem(String userEmail, Long productId, int quantity) {
        if (quantity < 1) throw new IllegalArgumentException("quantity must be >= 1");
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        if (product.getStatus() != Product.Status.ACTIVE) {
            throw new IllegalArgumentException("Product is not available");
        }

        Cart cart = cartRepository.findByUserEmail(userEmail).orElseGet(() -> {
            Cart c = Cart.builder().userEmail(userEmail).build();
            return cartRepository.save(c);
        });

        CartItem existing = cart.getItems().stream()
                .filter(i -> i.getProductId().equals(productId))
                .findFirst().orElse(null);

        int newQty = (existing == null ? 0 : existing.getQuantity()) + quantity;
        // Cap at available stock — a friendly UX limit, not a hard race-safety guarantee.
        // Real stock guarantee is enforced at checkout + webhook (with @Version).
        if (product.getStockQty() != null && newQty > product.getStockQty()) {
            newQty = product.getStockQty();
        }
        if (newQty < 1) {
            throw new IllegalArgumentException("Product is out of stock");
        }

        if (existing == null) {
            CartItem item = CartItem.builder()
                    .cart(cart)
                    .productId(productId)
                    .quantity(newQty)
                    .build();
            cart.getItems().add(item);
        } else {
            existing.setQuantity(newQty);
        }
        cartRepository.save(cart);
        return toDTO(cart);
    }

    public CartDTO updateItem(String userEmail, Long itemId, int quantity) {
        if (quantity < 1) throw new IllegalArgumentException("quantity must be >= 1");
        Cart cart = cartRepository.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Cart not found"));
        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Cart item not found"));
        Product product = productRepository.findById(item.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        int qty = quantity;
        if (product.getStockQty() != null && qty > product.getStockQty()) {
            qty = product.getStockQty();
        }
        if (qty < 1) throw new IllegalArgumentException("Product is out of stock");
        item.setQuantity(qty);
        cartRepository.save(cart);
        return toDTO(cart);
    }

    public CartDTO removeItem(String userEmail, Long itemId) {
        Cart cart = cartRepository.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Cart not found"));
        cart.getItems().removeIf(i -> i.getId().equals(itemId));
        cartRepository.save(cart);
        return toDTO(cart);
    }

    public void clearCart(String userEmail) {
        cartRepository.findByUserEmail(userEmail).ifPresent(c -> {
            c.getItems().clear();
            cartRepository.save(c);
        });
    }

    private CartDTO emptyCart(String userEmail) {
        return CartDTO.builder()
                .userEmail(userEmail)
                .items(List.of())
                .subtotalQar(BigDecimal.ZERO)
                .itemCount(0)
                .build();
    }

    private CartDTO toDTO(Cart cart) {
        List<CartItemDTO> itemDTOs = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        int totalQty = 0;
        for (CartItem item : cart.getItems()) {
            Product p = productRepository.findById(item.getProductId()).orElse(null);
            if (p == null) continue;
            String firstImage = firstUrl(p.getMediaUrls());
            BigDecimal lineTotal = p.getPriceQar().multiply(BigDecimal.valueOf(item.getQuantity()));
            subtotal = subtotal.add(lineTotal);
            totalQty += item.getQuantity();
            itemDTOs.add(CartItemDTO.builder()
                    .id(item.getId())
                    .productId(p.getId())
                    .quantity(item.getQuantity())
                    .slug(p.getSlug())
                    .sku(p.getSku())
                    .nameEn(p.getNameEn())
                    .nameAr(p.getNameAr())
                    .priceQar(p.getPriceQar())
                    .imageUrl(firstImage)
                    .stockQty(p.getStockQty())
                    .build());
        }
        return CartDTO.builder()
                .id(cart.getId())
                .userEmail(cart.getUserEmail())
                .items(itemDTOs)
                .subtotalQar(subtotal)
                .itemCount(totalQty)
                .build();
    }

    private static String firstUrl(String mediaUrlsJson) {
        if (mediaUrlsJson == null || !mediaUrlsJson.startsWith("[")) return null;
        int start = mediaUrlsJson.indexOf('"');
        int end = start >= 0 ? mediaUrlsJson.indexOf('"', start + 1) : -1;
        return (start >= 0 && end > start) ? mediaUrlsJson.substring(start + 1, end) : null;
    }
}
