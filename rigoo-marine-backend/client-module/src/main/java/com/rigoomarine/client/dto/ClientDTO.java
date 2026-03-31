package com.rigoomarine.client.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientDTO {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String role;
    private String address;
    private String company;
    private LocalDateTime createdAt;
}
