package com.rigoomarine.client.dto;

import lombok.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String role;
    private String address;
    private String company;
    private LocalDateTime createdAt;
    private Boolean emailVerified;
    private LocalDateTime passwordChangedAt;
}
