package com.rigoomarine.client.mail;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "email_templates")
@Data
public class EmailTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "subject_ar")
    private String subjectAr;

    @Column(name = "body_ar", columnDefinition = "TEXT")
    private String bodyAr;

    private String type;

    private Boolean active;
}
