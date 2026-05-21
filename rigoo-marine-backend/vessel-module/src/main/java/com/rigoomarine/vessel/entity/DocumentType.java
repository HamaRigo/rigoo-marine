package com.rigoomarine.vessel.entity;

public enum DocumentType {
    /** Official vessel registration / flag-state certificate. */
    REGISTRATION,
    /** P&I or hull & machinery insurance policy. */
    INSURANCE,
    /** Condition / tonnage / on-hire survey report. */
    SURVEY,
    /** Safety or radio certification (e.g. MCA, RINA). */
    CERTIFICATE,
    /** Classification society certificate (BV, Lloyd's, DNV). */
    CLASSIFICATION,
    /** Crew / captain licences and endorsements. */
    LICENCE,
    /** Catch-all for any other maritime document. */
    OTHER
}
