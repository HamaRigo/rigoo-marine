package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.entity.ServiceType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ServiceTypeClassifierTest {

    private final ServiceTypeClassifier classifier = new ServiceTypeClassifier();

    @Test
    void mapsOilChangeKeywordExactly() {
        assertThat(classifier.classifyName("Oil Change")).isEqualTo(ServiceType.OIL_CHANGE);
        assertThat(classifier.classifyName("Premium Marine Oil Change")).isEqualTo(ServiceType.OIL_CHANGE);
        assertThat(classifier.classifyName("oil change service")).isEqualTo(ServiceType.OIL_CHANGE);
    }

    @Test
    void mapsExistingSeedCatalogToCanonicalEnum() {
        // Names from the V1 seed migration.
        assertThat(classifier.classifyName("Engine Diagnostics")).isEqualTo(ServiceType.ENGINE_SERVICE);
        assertThat(classifier.classifyName("Propeller Repair")).isEqualTo(ServiceType.PROPELLER_SERVICE);
        assertThat(classifier.classifyName("Hull Cleaning")).isEqualTo(ServiceType.HULL_CLEANING);
        assertThat(classifier.classifyName("Bottom Paint")).isEqualTo(ServiceType.ANTIFOULING);
        assertThat(classifier.classifyName("Transmission Service")).isEqualTo(ServiceType.ENGINE_SERVICE);
        assertThat(classifier.classifyName("Generator Service")).isEqualTo(ServiceType.ENGINE_SERVICE);
    }

    @Test
    void mapsUnknownNameToOther() {
        assertThat(classifier.classifyName("Astronaut Training")).isEqualTo(ServiceType.OTHER);
        assertThat(classifier.classifyName("")).isEqualTo(ServiceType.OTHER);
        assertThat(classifier.classifyName(null)).isEqualTo(ServiceType.OTHER);
    }

    @Test
    void mapsIssueCategoriesAsFallback() {
        assertThat(classifier.classifyIssueCategory("ENGINE")).isEqualTo(ServiceType.ENGINE_SERVICE);
        assertThat(classifier.classifyIssueCategory("HULL")).isEqualTo(ServiceType.HULL_CLEANING);
        assertThat(classifier.classifyIssueCategory("PROPULSION")).isEqualTo(ServiceType.PROPELLER_SERVICE);
        assertThat(classifier.classifyIssueCategory("SAFETY")).isEqualTo(ServiceType.INSPECTION);
        assertThat(classifier.classifyIssueCategory("ELECTRICAL")).isEqualTo(ServiceType.OTHER);
        assertThat(classifier.classifyIssueCategory(null)).isEqualTo(ServiceType.OTHER);
    }

    @Test
    void classifyDedupesIdenticalTypesAcrossNames() {
        // "Engine Diagnostics" and "Generator Service" both map to ENGINE_SERVICE.
        Set<ServiceType> result = classifier.classify(
            List.of("Engine Diagnostics", "Generator Service"), null);
        assertThat(result).containsExactly(ServiceType.ENGINE_SERVICE);
    }

    @Test
    void classifyReturnsMultipleTypesWhenNamesDiffer() {
        Set<ServiceType> result = classifier.classify(
            List.of("Oil Change", "Hull Cleaning", "Propeller Repair"), null);
        assertThat(result).containsExactlyInAnyOrder(
            ServiceType.OIL_CHANGE, ServiceType.HULL_CLEANING, ServiceType.PROPELLER_SERVICE);
    }

    @Test
    void classifyFallsBackToIssueCategoryWhenNamesEmpty() {
        // Service-request flow has no catalog services.
        assertThat(classifier.classify(null, "ENGINE")).containsExactly(ServiceType.ENGINE_SERVICE);
        assertThat(classifier.classify(List.of(), "HULL")).containsExactly(ServiceType.HULL_CLEANING);
    }

    @Test
    void classifyAlwaysReturnsNonEmpty() {
        assertThat(classifier.classify(null, null)).containsExactly(ServiceType.OTHER);
        assertThat(classifier.classify(List.of(), null)).containsExactly(ServiceType.OTHER);
    }
}
