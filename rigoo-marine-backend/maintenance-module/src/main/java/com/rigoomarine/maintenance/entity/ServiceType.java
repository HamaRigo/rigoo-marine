package com.rigoomarine.maintenance.entity;

/**
 * Categories of recurring marine-service events. OIL_CHANGE is first-class
 * (the most common interval-driven service); the rest cover the bulk of
 * Qatar-market vessel maintenance. OTHER is the escape hatch — the free-text
 * {@code performedBy} and {@code notes} fields disambiguate at display time.
 *
 * <p>New values are safe to add; storage is {@code VARCHAR(40)} so neither the
 * column width nor existing rows are affected. Removing a value is a breaking
 * change (history rows already reference it) — deprecate instead.
 */
public enum ServiceType {
    OIL_CHANGE,
    ENGINE_SERVICE,
    HULL_CLEANING,
    ANTIFOULING,
    PROPELLER_SERVICE,
    IMPELLER,
    FUEL_FILTER,
    ZINC_ANODES,
    BATTERY,
    INSPECTION,
    OTHER
}
