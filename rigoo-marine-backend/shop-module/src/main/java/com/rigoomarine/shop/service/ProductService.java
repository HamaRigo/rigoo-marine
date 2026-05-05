package com.rigoomarine.shop.service;

import com.rigoomarine.shop.dto.ProductDTO;
import com.rigoomarine.shop.entity.Product;
import com.rigoomarine.shop.repository.ProductRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductService {

    private final ProductRepository repository;

    private static final Pattern QUOTED = Pattern.compile("\"([^\"]+)\"");

    public ProductDTO create(ProductDTO dto) {
        Product entity = fromDTO(dto, new Product());
        // Slug + SKU are NOT NULL — generate before insert when blank.
        if (entity.getSlug() == null || entity.getSlug().isBlank()) {
            entity.setSlug(generateSlug(entity.getNameEn()));
        }
        if (entity.getSku() == null || entity.getSku().isBlank()) {
            entity.setSku(generateSku(entity.getCategory()));
        }
        return toDTO(repository.save(entity));
    }

    public ProductDTO update(Long id, ProductDTO dto) {
        Product entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        fromDTO(dto, entity);
        return toDTO(repository.save(entity));
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public ProductDTO getById(Long id) {
        Product entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        return toDTO(entity);
    }

    @Transactional(readOnly = true)
    public ProductDTO getBySlug(String slug) {
        Product entity = repository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        return toDTO(entity);
    }

    private static String generateSlug(String nameEn) {
        String base = (nameEn == null ? "product" : nameEn).toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (base.isEmpty()) base = "product";
        if (base.length() > 200) base = base.substring(0, 200);
        return base + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private static String generateSku(Product.Category category) {
        String prefix = (category != null ? category.name() : "PART").substring(0, 1);
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    /**
     * Public catalog search.
     * Public callers see only ACTIVE; admins can pass adminStatus to override.
     * Filters: q (matches nameEn/nameAr/descriptionEn/descriptionAr/brand/sku),
     * category, brand, price range, in-stock only.
     */
    @Transactional(readOnly = true)
    public Page<ProductDTO> search(
            String q,
            String category,
            String brand,
            BigDecimal priceMin,
            BigDecimal priceMax,
            Boolean inStock,
            String adminStatus,
            Pageable pageable
    ) {
        Specification<Product> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Public callers see only ACTIVE. Admin can override via adminStatus (or "ALL").
            if (adminStatus != null && !adminStatus.isBlank() && !"ALL".equalsIgnoreCase(adminStatus)) {
                predicates.add(cb.equal(root.get("status"), Product.Status.valueOf(adminStatus)));
            } else if (adminStatus == null) {
                predicates.add(cb.equal(root.get("status"), Product.Status.ACTIVE));
            }

            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("nameEn")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("nameAr"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("descriptionEn"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("descriptionAr"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("brand"), "")), like),
                        cb.like(cb.lower(root.get("sku")), like)
                ));
            }
            if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category)) {
                predicates.add(cb.equal(root.get("category"), Product.Category.valueOf(category)));
            }
            if (brand != null && !brand.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("brand")), brand.toLowerCase()));
            }
            if (priceMin != null) predicates.add(cb.greaterThanOrEqualTo(root.get("priceQar"), priceMin));
            if (priceMax != null) predicates.add(cb.lessThanOrEqualTo(root.get("priceQar"), priceMax));
            if (Boolean.TRUE.equals(inStock)) predicates.add(cb.greaterThan(root.get("stockQty"), 0));

            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
        return repository.findAll(spec, pageable).map(this::toDTO);
    }

    // -------- Mapping --------

    private Product fromDTO(ProductDTO d, Product e) {
        if (d.getSlug() != null && !d.getSlug().isBlank()) e.setSlug(d.getSlug());
        if (d.getSku() != null && !d.getSku().isBlank()) e.setSku(d.getSku());
        e.setNameEn(d.getNameEn());
        e.setNameAr(d.getNameAr());
        e.setDescriptionEn(d.getDescriptionEn());
        e.setDescriptionAr(d.getDescriptionAr());
        if (d.getCategory() != null) e.setCategory(Product.Category.valueOf(d.getCategory()));
        e.setBrand(d.getBrand());
        e.setPriceQar(d.getPriceQar());
        e.setCurrency(d.getCurrency() != null ? d.getCurrency() : "QAR");
        if (d.getStockQty() != null) e.setStockQty(d.getStockQty());
        if (d.getStatus() != null) e.setStatus(Product.Status.valueOf(d.getStatus()));
        e.setMediaUrls(serializeUrls(d.getMediaUrls()));
        e.setSpecsEn(d.getSpecsEn());
        e.setSpecsAr(d.getSpecsAr());
        e.setCreatedBy(d.getCreatedBy());
        if (d.getViewCount() != null) e.setViewCount(d.getViewCount());
        return e;
    }

    private ProductDTO toDTO(Product e) {
        return ProductDTO.builder()
                .id(e.getId())
                .slug(e.getSlug())
                .sku(e.getSku())
                .nameEn(e.getNameEn())
                .nameAr(e.getNameAr())
                .descriptionEn(e.getDescriptionEn())
                .descriptionAr(e.getDescriptionAr())
                .category(e.getCategory() != null ? e.getCategory().name() : null)
                .brand(e.getBrand())
                .priceQar(e.getPriceQar())
                .currency(e.getCurrency())
                .stockQty(e.getStockQty())
                .status(e.getStatus() != null ? e.getStatus().name() : null)
                .mediaUrls(parseUrls(e.getMediaUrls()))
                .specsEn(e.getSpecsEn())
                .specsAr(e.getSpecsAr())
                .createdBy(e.getCreatedBy())
                .viewCount(e.getViewCount())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private String serializeUrls(List<String> urls) {
        if (urls == null || urls.isEmpty()) return null;
        return urls.stream()
                .filter(u -> u != null && !u.isBlank())
                .map(u -> "\"" + u.replace("\"", "\\\"") + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }

    private List<String> parseUrls(String json) {
        if (json == null || !json.startsWith("[")) return List.of();
        Matcher m = QUOTED.matcher(json);
        List<String> out = new ArrayList<>();
        while (m.find()) out.add(m.group(1));
        return out;
    }
}
